import { Logger } from "@nestjs/common";
import { InjectQueue, Processor, WorkerHost } from "@nestjs/bullmq";
import { prisma } from "@amni/db";
import { createErpClientForTenant, runImportToErp, type ImportRowError } from "@amni/erp";
import { BullQueue, prepareImportRows } from "@amni/shared";
import type { ImportFileMetadata, ImportKind, ImportMapping, ImportSummary, ImportValidation } from "@amni/shared";
import type { Job, Queue } from "bullmq";

export interface ImportJobPayload {
  importId: string;
  tenantId: string;
}

interface ImportNotifyPayload {
  userId: string;
  type: "success";
  title: string;
  body: string;
  link: string;
}

@Processor(BullQueue.IMPORTS)
export class ImportsProcessor extends WorkerHost {
  private readonly logger = new Logger(ImportsProcessor.name);

  constructor(@InjectQueue(BullQueue.NOTIFY) private readonly notify: Queue<ImportNotifyPayload>) {
    super();
  }

  async process(job: Job<ImportJobPayload>) {
    const { importId, tenantId } = job.data;

    const importJob = await prisma.dataImportJob.findFirst({
      where: { id: importId, tenantId },
    });

    if (!importJob) {
      this.logger.warn(`import ${importId} not found for tenant ${tenantId}; dropping job`);
      return;
    }
    if (!importJob.fileMetadata || !importJob.mapping) {
      throw new Error(`import ${importId} is missing file metadata or mapping`);
    }

    const fileMetadata = importJob.fileMetadata as unknown as ImportFileMetadata;
    const mapping = importJob.mapping as unknown as ImportMapping;
    const kind = importJob.kind as ImportKind;

    const prepared = prepareImportRows(fileMetadata.rows, mapping, kind);
    const validation: ImportValidation = { issues: prepared.issues };

    let summary: ImportSummary;
    let rowErrors: ImportRowError[] = [];
    const validRows = prepared.rows.filter((row) => row.ok).map(({ row, record }) => ({ row, record }));

    try {
      const client = await createErpClientForTenant({ tenantId, requestId: importId });
      const result = await runImportToErp(client, kind, validRows, mapping);
      rowErrors = result.errors;
      summary = {
        totalRows: prepared.summary.totalRows,
        created: result.summary.created,
        updated: result.summary.updated,
        skipped: prepared.summary.failed,
        failed: result.summary.failed,
        warnings: prepared.summary.warnings,
      };
    } catch (err) {
      // Tenant ERP unreachable — the whole batch fails but the job completes
      // with a failed summary so the UI can surface the reason.
      const message = err instanceof Error ? err.message : "ERPNext unreachable";
      this.logger.error(`import ${importId} ERP write failed: ${message}`);
      summary = {
        totalRows: prepared.summary.totalRows,
        created: 0,
        updated: 0,
        skipped: prepared.summary.failed,
        failed: validRows.length,
        warnings: prepared.summary.warnings,
      };
      rowErrors = validRows.map(({ row }) => ({ row, message }));
    }

    await prisma.dataImportJob.update({
      where: { id: importId },
      data: {
        validation,
        summary,
        stage: "COMPLETED",
        completedById: importJob.initiatedById,
      },
    });

    await prisma.auditLog
      .create({
        data: {
          actorId: importJob.initiatedById,
          action: "import.completed",
          resourceType: "import",
          resourceId: importId,
        },
      })
      .catch(() => undefined);

    const failedCount = summary.failed;
    const errorDetail = rowErrors.length > 0 ? ` (e.g. row ${rowErrors[0].row}: ${rowErrors[0].message})` : "";

    await this.notify.add("notify", {
      userId: importJob.initiatedById,
      type: "success",
      title: "Import finished",
      body: `Import finished: ${summary.created} created, ${summary.updated} updated, ${failedCount} failed.${errorDetail}`,
      link: `/imports/${importId}`,
    });

    this.logger.log(
      `import ${importId} completed: ${summary.created} created, ${summary.updated} updated, ${failedCount} failed`,
    );
  }
}
