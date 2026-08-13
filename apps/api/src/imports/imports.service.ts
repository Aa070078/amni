import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { Prisma, prisma } from "@amni/db";
import {
  BullQueue,
  ErrorCode,
  IMPORT_TEMPLATES,
  importFileMetadataSchema,
  importKindSchema,
  importMappingSchema,
  importStageSchema,
  importSummarySchema,
  importValidationSchema,
  type ColumnMapping,
  type ImportErrorRowsResponse,
  type ImportJob,
  type ImportJobListQuery,
  type ImportJobListResponse,
  type ImportMapping,
  type ImportTemplate,
  type ImportValidation,
  type SetImportFileInput,
  type SetImportMappingInput,
  type StartImportResponse,
} from "@amni/shared";
import type { Queue } from "bullmq";

import { ApiException } from "../common/api.exception";
import { buildCsv, csvToRecords, parseCsv, suggestMapping, type CsvRecord } from "./csv";
import { validateRecords } from "./validation";

const MAX_FILE_BYTES = 5_000_000;
const MAX_IMPORT_ROWS = 5_000;

/** Internal stored shape of `fileMetadata`: shared contract + full parsed rows. */
interface StoredFileMetadata {
  fileName: string;
  size: number;
  rowCount: number;
  headers: string[];
  sampleRows: CsvRecord[];
  suggestedMapping?: ImportMapping;
  rows: CsvRecord[];
}

type JobRow = {
  id: string;
  companyId: string;
  tenantId: string;
  kind: string;
  stage: string;
  fileMetadata: unknown;
  mapping: unknown;
  validation: unknown;
  summary: unknown;
  errorRowsUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  initiatedBy?: { email: string } | null;
};

/**
 * The shared contract never carries the parsed file rows or the worker's
 * error-rows CSV; zod object parsing drops those unknown keys automatically.
 */
const toJob = (row: JobRow): ImportJob => ({
  id: row.id,
  kind: importKindSchema.parse(row.kind),
  stage: importStageSchema.parse(row.stage),
  file: row.fileMetadata ? importFileMetadataSchema.parse(row.fileMetadata) : undefined,
  mapping: row.mapping ? importMappingSchema.parse(row.mapping) : undefined,
  validation: row.validation ? importValidationSchema.parse(row.validation) : undefined,
  summary: row.summary ? importSummarySchema.parse(row.summary) : undefined,
  errorRowsUrl: row.errorRowsUrl ?? undefined,
  initiatedBy: row.initiatedBy?.email,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

/**
 * Six-stage data import pipeline (PRODUCT_SPEC §5). Jobs are created and
 * staged here; the heavy work is enqueued on the `imports` BullMQ queue and
 * executed by the worker. Tenant/company scoping is derived server-side from
 * the authenticated user's membership.
 */
@Injectable()
export class ImportsService {
  constructor(@InjectQueue(BullQueue.IMPORTS) private readonly queue: Queue) {}

  templates(): ImportTemplate[] {
    return [...IMPORT_TEMPLATES];
  }

  private templateFor(kind: string): ImportTemplate {
    const template = IMPORT_TEMPLATES.find((entry) => entry.kind === kind);
    if (!template) {
      throw new ApiException({ code: ErrorCode.UNPROCESSABLE, status: 422, message: `Unknown import kind ${kind}` });
    }
    return template;
  }

  private async workspace(userId: string): Promise<{ companyId: string; tenantId: string }> {
    const membership = await prisma.membership.findFirst({
      where: { userId },
      include: { company: { include: { tenant: true } } },
    });
    if (!membership?.company) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: "Workspace not found" });
    }
    if (!membership.company.tenant) {
      throw new ApiException({
        code: ErrorCode.TENANT_NOT_READY,
        status: 409,
        message: "Workspace is not provisioned yet",
      });
    }
    return { companyId: membership.company.id, tenantId: membership.company.tenant.id };
  }

  private async jobForUser(userId: string, id: string): Promise<JobRow & { tenantId: string }> {
    const { companyId, tenantId } = await this.workspace(userId);
    const row = await prisma.dataImportJob.findFirst({
      where: { id, companyId },
      include: { initiatedBy: { select: { email: true } } },
    });
    if (!row) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Import job ${id} not found` });
    }
    return { ...row, tenantId };
  }

  private async audit(
    user: { id: string; email: string },
    row: { id: string; companyId: string; kind: string; stage: string },
    action: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        actorEmail: user.email,
        companyId: row.companyId,
        action,
        resourceType: "import_job",
        resourceId: row.id,
        metadata: { kind: row.kind, stage: row.stage, ...metadata },
      },
    });
  }

  async list(userId: string, query: ImportJobListQuery): Promise<ImportJobListResponse> {
    const { companyId } = await this.workspace(userId);
    const { kind, stage, q, page, pageSize } = query;

    const where: Prisma.DataImportJobWhereInput = {
      companyId,
      ...(kind ? { kind } : {}),
      ...(stage ? { stage } : {}),
      ...(q ? { id: { contains: q.toLowerCase() } } : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.dataImportJob.findMany({
        where,
        include: { initiatedBy: { select: { email: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.dataImportJob.count({ where }),
    ]);

    return { items: rows.map(toJob), meta: { total, page, pageSize } };
  }

  async detail(userId: string, id: string): Promise<ImportJob> {
    return toJob(await this.jobForUser(userId, id));
  }

  async createJob(
    user: { id: string; email: string },
    input: { kind: string; mode: "create" | "update_by_key" | "upsert"; keyField?: string },
  ): Promise<ImportJob> {
    const template = this.templateFor(input.kind);
    const { companyId, tenantId } = await this.workspace(user.id);

    const keyField =
      input.mode === "create" ? undefined : input.keyField ?? template.keyField;
    if (input.mode !== "create" && !keyField) {
      throw new ApiException({
        code: ErrorCode.UNPROCESSABLE,
        status: 422,
        message: `Choose a key column for ${input.mode.replace("_", " ")} mode`,
      });
    }

    const row = await prisma.dataImportJob.create({
      data: {
        tenantId,
        companyId,
        kind: input.kind,
        stage: "PRE_IMPORT",
        mapping: { mode: input.mode, keyField } satisfies ImportMapping,
        initiatedById: user.id,
      },
    });

    await this.audit(user, row, "import.job_create", { mode: input.mode });
    return toJob({ ...row, initiatedBy: { email: user.email } });
  }

  async setFile(
    user: { id: string; email: string },
    id: string,
    input: SetImportFileInput,
  ): Promise<ImportJob> {
    const row = await this.jobForUser(user.id, id);
    if (row.stage === "IMPORT" || row.stage === "COMPLETED") {
      throw new ApiException({
        code: ErrorCode.IMPORT_IN_PROGRESS,
        status: 409,
        message: "Cannot change the file while an import is in progress",
      });
    }

    const bytes = Buffer.byteLength(input.content, "utf8");
    if (bytes > MAX_FILE_BYTES) {
      throw new ApiException({ code: ErrorCode.UNPROCESSABLE, status: 422, message: "File is too large" });
    }

    const cells = parseCsv(input.content);
    if (cells.length === 0) {
      throw new ApiException({ code: ErrorCode.UNPROCESSABLE, status: 422, message: "File is empty" });
    }
    const headers = cells[0];
    if (headers.length === 0 || headers.some((header) => header.trim() === "")) {
      throw new ApiException({ code: ErrorCode.UNPROCESSABLE, status: 422, message: "File is missing a header row" });
    }
    if (new Set(headers).size !== headers.length) {
      throw new ApiException({ code: ErrorCode.UNPROCESSABLE, status: 422, message: "File contains duplicate column names" });
    }
    const dataRows = cells.slice(1);
    if (dataRows.length > MAX_IMPORT_ROWS) {
      throw new ApiException({
        code: ErrorCode.UNPROCESSABLE,
        status: 422,
        message: `File exceeds the ${MAX_IMPORT_ROWS} row limit`,
      });
    }

    const records = csvToRecords(headers, dataRows);
    const template = this.templateFor(row.kind);
    const currentMapping = row.mapping ? importMappingSchema.parse(row.mapping) : undefined;
    const suggestedMapping: ImportMapping = {
      mode: currentMapping?.mode ?? "create",
      keyField: currentMapping?.keyField ?? template.keyField,
      columns: suggestMapping(headers, template),
    };

    const fileMetadata: StoredFileMetadata = {
      fileName: input.fileName,
      size: bytes,
      rowCount: records.length,
      headers,
      sampleRows: records.slice(0, 10),
      suggestedMapping,
      rows: records,
    };

    await this.audit(user, row, "import.file_upload", { fileName: input.fileName, rowCount: records.length });

    const updated = await prisma.dataImportJob.update({
      where: { id: row.id },
      data: {
        stage: "UPLOAD",
        fileMetadata,
        mapping: null,
        validation: null,
        summary: null,
        errorRowsUrl: null,
      },
    });
    return toJob({ ...updated, initiatedBy: row.initiatedBy });
  }

  async setMapping(
    user: { id: string; email: string },
    id: string,
    input: SetImportMappingInput,
  ): Promise<ImportJob> {
    const row = await this.jobForUser(user.id, id);
    const file = row.fileMetadata as StoredFileMetadata | null;
    if (!file?.headers?.length) {
      throw new ApiException({ code: ErrorCode.UNPROCESSABLE, status: 422, message: "Upload a file before mapping columns" });
    }

    const template = this.templateFor(row.kind);
    const mapping = input.mapping;
    const templateField = new Set(template.columns.map((column) => column.field));
    const headerSet = new Set(file.headers);

    if (mapping.mode !== "create") {
      if (!mapping.keyField || !templateField.has(mapping.keyField)) {
        throw new ApiException({
          code: ErrorCode.IMPORT_MAPPING_INVALID,
          status: 422,
          message: `Key field "${mapping.keyField ?? ""}" is not a template column`,
        });
      }
    }
    for (const column of mapping.columns) {
      if (!headerSet.has(column.sourceHeader)) {
        throw new ApiException({
          code: ErrorCode.IMPORT_MAPPING_INVALID,
          status: 422,
          message: `"${column.sourceHeader}" is not a column in the uploaded file`,
        });
      }
      if (column.targetField !== "" && !templateField.has(column.targetField)) {
        throw new ApiException({
          code: ErrorCode.IMPORT_MAPPING_INVALID,
          status: 422,
          message: `"${column.targetField}" is not a template field`,
        });
      }
    }
    if (!mapping.columns.some((column) => column.targetField !== "")) {
      throw new ApiException({ code: ErrorCode.IMPORT_MAPPING_INVALID, status: 422, message: "Map at least one column" });
    }

    const templateColumns = new Map(template.columns.map((column) => [column.field, column]));
    const columns: ColumnMapping[] = mapping.columns.map((column) => {
      const target = column.targetField !== "" ? templateColumns.get(column.targetField) : undefined;
      return {
        sourceHeader: column.sourceHeader,
        targetField: column.targetField,
        required: target?.required ?? false,
        type: target?.type ?? column.type,
      };
    });
    const normalized: ImportMapping = {
      ...mapping,
      keyField: mapping.mode === "create" ? undefined : mapping.keyField,
      columns,
    };

    await this.audit(user, row, "import.mapping_set", { mode: normalized.mode });

    const updated = await prisma.dataImportJob.update({
      where: { id: row.id },
      data: { stage: "MAPPING", mapping: normalized, validation: null, summary: null, errorRowsUrl: null },
    });
    return toJob({ ...updated, initiatedBy: row.initiatedBy });
  }

  async validate(user: { id: string; email: string }, id: string): Promise<ImportValidation> {
    const row = await this.jobForUser(user.id, id);
    const file = row.fileMetadata as StoredFileMetadata | null;
    const mapping = row.mapping ? importMappingSchema.parse(row.mapping) : undefined;
    if (!file?.rows?.length) {
      throw new ApiException({ code: ErrorCode.UNPROCESSABLE, status: 422, message: "Upload a file before validating" });
    }
    if (!mapping) {
      throw new ApiException({ code: ErrorCode.UNPROCESSABLE, status: 422, message: "Map columns before validating" });
    }

    const validation = validateRecords(file.rows, mapping, this.templateFor(row.kind));
    await this.audit(user, row, "import.validate", {
      errors: validation.stats.errors,
      warnings: validation.stats.warnings,
    });

    await prisma.dataImportJob.update({
      where: { id: row.id },
      data: { stage: "VALIDATION", validation },
    });
    return validation;
  }

  async start(user: { id: string; email: string }, id: string): Promise<StartImportResponse> {
    const row = await this.jobForUser(user.id, id);
    if (row.stage === "COMPLETED") {
      throw new ApiException({ code: ErrorCode.IMPORT_IN_PROGRESS, status: 409, message: "Import already completed" });
    }
    if (row.stage === "IMPORT") {
      return { jobId: row.id, startedAt: row.updatedAt.toISOString() };
    }

    const file = row.fileMetadata as StoredFileMetadata | null;
    const mapping = row.mapping ? importMappingSchema.parse(row.mapping) : undefined;
    if (!file?.rows?.length || !mapping) {
      throw new ApiException({ code: ErrorCode.UNPROCESSABLE, status: 422, message: "Upload a file and map columns before importing" });
    }

    let validation = row.validation ? importValidationSchema.parse(row.validation) : undefined;
    if (!validation) {
      validation = validateRecords(file.rows, mapping, this.templateFor(row.kind));
    }
    if (validation.stats.errors > 0) {
      throw new ApiException({
        code: ErrorCode.IMPORT_VALIDATION_FAILED,
        status: 409,
        message: `${validation.stats.errors} row(s) need fixing before import`,
      });
    }

    await this.audit(user, row, "import.start", { mode: mapping.mode });

    const updated = await prisma.dataImportJob.update({
      where: { id: row.id },
      data: { stage: "IMPORT", validation },
    });

    await this.queue.add(
      "import",
      { importId: row.id, tenantId: row.tenantId },
      { jobId: row.id, attempts: 3, backoff: { type: "exponential", delay: 5_000 } },
    );

    return { jobId: row.id, startedAt: updated.updatedAt.toISOString() };
  }

  async errorRows(userId: string, id: string): Promise<ImportErrorRowsResponse> {
    const row = await this.jobForUser(userId, id);
    const file = row.fileMetadata as StoredFileMetadata | null;
    const headers = file?.headers ?? [];
    const summary = row.summary as { failedRowsCsv?: string } | null;

    let content: string | undefined = summary?.failedRowsCsv;

    if (content === undefined && file?.rows?.length && row.mapping) {
      const mapping = importMappingSchema.parse(row.mapping);
      const validation = validateRecords(file.rows, mapping, this.templateFor(row.kind));
      const failedRows = new Set(
        validation.issues
          .filter((issue) => issue.severity === "error" && issue.row != null)
          .map((issue) => issue.row as number),
      );
      const data = file.rows
        .map((record, index) => ({ record, rowNumber: index + 1 }))
        .filter(({ rowNumber }) => failedRows.has(rowNumber))
        .map(({ record }) => headers.map((header) => record[header] ?? ""));
      content = buildCsv(headers, data);
    }

    if (content === undefined) {
      content = buildCsv(headers, []);
    }
    return { fileName: `import-errors-${row.id}.csv`, content };
  }
}
