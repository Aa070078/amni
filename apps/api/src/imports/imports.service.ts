import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";
import { Prisma, prisma } from "@amni/db";
import {
  BullQueue,
  ErrorCode,
  IMPORT_TEMPLATES,
  IMPORT_TEMPLATE_BY_KIND,
  buildTemplateCsv,
  isImportTemplate,
  validateImportRows,
} from "@amni/shared";
import type {
  CreateImportInput,
  ImportFileMetadata,
  ImportJob,
  ImportJobListResponse,
  ImportKind,
  ImportMapping,
  ImportStage,
  ImportSummary,
  ImportTemplatesResponse,
  ImportValidation,
  ImportValidationResult,
} from "@amni/shared";

import { ApiException } from "../common/api.exception";
import type { RequestMeta } from "../auth/auth.service";
import { isImportFileSupported, MAX_IMPORT_FILE_SIZE, parseImportFile, type UploadedImportFile } from "./imports-file";

export interface ImportJobPayload {
  importId: string;
  tenantId: string;
}

const BLOCKED_STAGES: ImportStage[] = ["IMPORT", "COMPLETED"];

@Injectable()
export class ImportsService {
  constructor(@InjectQueue(BullQueue.IMPORTS) private readonly queue: Queue<ImportJobPayload>) {}

  async create(input: CreateImportInput, userId: string, meta: RequestMeta): Promise<ImportJob> {
    const { companyId, tenantId } = await this.resolveTenant(userId);

    const job = await prisma.dataImportJob.create({
      data: {
        tenantId,
        companyId,
        kind: input.kind,
        stage: "PRE_IMPORT",
        initiatedById: userId,
      },
    });

    await this.audit(userId, "import.create", job.id, meta);
    return this.toImportJob(job);
  }

  async list(userId: string): Promise<ImportJobListResponse> {
    const { tenantId } = await this.resolveTenant(userId);

    const jobs = await prisma.dataImportJob.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return { items: jobs.map((job) => this.toImportJob(job, false)), total: jobs.length };
  }

  async templates(): Promise<ImportTemplatesResponse> {
    return { items: IMPORT_TEMPLATES };
  }

  templateCsv(kind: string): string {
    if (!isImportTemplate(kind)) {
      throw new ApiException({ code: ErrorCode.IMPORT_TEMPLATE_INVALID, status: 404, message: `Unknown import template "${kind}"` });
    }
    return buildTemplateCsv(kind);
  }

  async get(id: string, userId: string): Promise<ImportJob> {
    const job = await this.findJob(id, userId);
    return this.toImportJob(job, true);
  }

  async upload(id: string, file: UploadedImportFile, userId: string, meta: RequestMeta): Promise<ImportJob> {
    const job = await this.findJob(id, userId);
    this.assertMutable(job.stage);

    if (!isImportFileSupported(file.filename)) {
      throw new ApiException({ code: ErrorCode.IMPORT_TEMPLATE_INVALID, status: 400, message: "Unsupported file type. Upload a .csv or .xlsx file." });
    }
    if (file.size > MAX_IMPORT_FILE_SIZE) {
      throw new ApiException({ code: ErrorCode.IMPORT_TEMPLATE_INVALID, status: 400, message: "File is too large. Maximum size is 10 MB." });
    }

    let fileMetadata: ImportFileMetadata;
    try {
      fileMetadata = parseImportFile(file);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to parse file";
      throw new ApiException({ code: ErrorCode.IMPORT_TEMPLATE_INVALID, status: 400, message });
    }

    const updated = await prisma.dataImportJob.update({
      where: { id },
      data: { fileMetadata, stage: "UPLOAD" },
    });

    await this.audit(userId, "import.upload", id, meta);
    return this.toImportJob(updated, true);
  }

  async saveMapping(id: string, mapping: ImportMapping, userId: string, meta: RequestMeta): Promise<ImportJob> {
    const job = await this.findJob(id, userId);
    this.assertMutable(job.stage);

    const template = IMPORT_TEMPLATE_BY_KIND[job.kind as ImportKind];
    const validFields = new Set(template.columns.map((column) => column.field));
    for (const column of mapping.columns) {
      if (!validFields.has(column.targetField)) {
        throw new ApiException({
          code: ErrorCode.IMPORT_MAPPING_INVALID,
          status: 400,
          message: `"${column.targetField}" is not a valid target field for ${job.kind}`,
        });
      }
    }

    const updated = await prisma.dataImportJob.update({
      where: { id },
      data: { mapping, stage: "MAPPING" },
    });

    await this.audit(userId, "import.mapping", id, meta);
    return this.toImportJob(updated, true);
  }

  async validation(id: string, userId: string): Promise<ImportValidationResult> {
    const job = await this.findJob(id, userId);
    if (!job.fileMetadata || !job.mapping) {
      throw new ApiException({ code: ErrorCode.UNPROCESSABLE, status: 422, message: "Upload a file and save a mapping before validating" });
    }

    const fileMetadata = job.fileMetadata as unknown as ImportFileMetadata;
    const mapping = job.mapping as unknown as ImportMapping;
    const { summary, issues } = validateImportRows(fileMetadata.rows, mapping, job.kind as ImportKind);

    const validation: ImportValidation = { issues };
    await prisma.dataImportJob.update({
      where: { id },
      data: { validation, summary, stage: "VALIDATION" },
    });

    return { summary, issues };
  }

  async execute(id: string, userId: string, meta: RequestMeta): Promise<ImportJob> {
    const job = await this.findJob(id, userId);
    this.assertMutable(job.stage);
    if (!job.fileMetadata || !job.mapping) {
      throw new ApiException({ code: ErrorCode.UNPROCESSABLE, status: 422, message: "Upload a file and save a mapping before executing" });
    }

    await prisma.dataImportJob.update({
      where: { id },
      data: { stage: "IMPORT" },
    });

    await this.queue.add("import", { importId: id, tenantId: job.tenantId });
    await this.audit(userId, "import.execute", id, meta);

    return this.toImportJob({ ...job, stage: "IMPORT" });
  }

  async summary(id: string, userId: string): Promise<{ summary: ImportSummary; errorRowsUrl?: string }> {
    const job = await this.findJob(id, userId);
    if (job.stage !== "COMPLETED" || !job.summary) {
      throw new ApiException({ code: ErrorCode.IMPORT_IN_PROGRESS, status: 409, message: "Import has not completed yet" });
    }

    return {
      summary: job.summary as unknown as ImportSummary,
      errorRowsUrl: job.errorRowsUrl ?? undefined,
    };
  }

  async rollback(id: string, userId: string, meta: RequestMeta): Promise<ImportJob> {
    const job = await this.findJob(id, userId);
    if (job.stage === "IMPORT") {
      throw new ApiException({ code: ErrorCode.IMPORT_IN_PROGRESS, status: 409, message: "Import is currently running" });
    }

    const updated = await prisma.dataImportJob.update({
      where: { id },
      data: { stage: "PRE_IMPORT", mapping: Prisma.JsonNull, validation: Prisma.JsonNull, summary: Prisma.JsonNull, errorRowsUrl: null },
    });

    await this.audit(userId, "import.rollback", id, meta);
    return this.toImportJob(updated, true);
  }

  private async resolveTenant(userId: string): Promise<{ companyId: string; tenantId: string }> {
    const membership = await prisma.membership.findFirst({
      where: { userId },
      include: { company: { include: { tenant: true } } },
    });

    const tenant = membership?.company?.tenant;
    if (!membership || !tenant) {
      throw new ApiException({ code: ErrorCode.TENANT_NOT_READY, status: 409, message: "No provisioned tenant for this account" });
    }
    return { companyId: membership.companyId, tenantId: tenant.id };
  }

  private async findJob(id: string, userId: string) {
    const { tenantId } = await this.resolveTenant(userId);
    const job = await prisma.dataImportJob.findFirst({
      where: { id, tenantId },
    });
    if (!job) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Import job ${id} not found` });
    }
    return job;
  }

  private assertMutable(stage: string) {
    if (BLOCKED_STAGES.includes(stage as ImportStage)) {
      throw new ApiException({ code: ErrorCode.IMPORT_IN_PROGRESS, status: 409, message: "Import has already been executed" });
    }
  }

  private async audit(actorId: string, action: string, resourceId: string, meta: RequestMeta) {
    await prisma.auditLog
      .create({
        data: {
          actorId,
          action,
          resourceType: "import",
          resourceId,
          ip: meta.ip,
          requestId: meta.requestId,
        },
      })
      .catch(() => undefined);
  }

  private toImportJob(job: {
    id: string;
    kind: string;
    stage: string;
    fileMetadata: unknown;
    mapping: unknown;
    validation: unknown;
    summary: unknown;
    errorRowsUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
  }, includeRows = true): ImportJob {
    const fileMetadata = job.fileMetadata as ImportFileMetadata | null;
    return {
      id: job.id,
      kind: job.kind as ImportKind,
      stage: job.stage as ImportStage,
      fileMetadata: fileMetadata
        ? includeRows ? fileMetadata : { ...fileMetadata, rows: [] }
        : undefined,
      mapping: (job.mapping as ImportMapping | null) ?? undefined,
      validation: (job.validation as ImportValidation | null) ?? undefined,
      summary: (job.summary as ImportSummary | null) ?? undefined,
      errorRowsUrl: job.errorRowsUrl ?? undefined,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    };
  }
}
