import { Logger } from "@nestjs/common";
import { InjectQueue, Processor, WorkerHost } from "@nestjs/bullmq";
import { prisma } from "@amni/db";
import { BullQueue, validateImportRows } from "@amni/shared";
import type { ImportFileMetadata, ImportKind, ImportMapping, ImportValidation } from "@amni/shared";
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
    const { summary, issues } = validateImportRows(fileMetadata.rows, mapping, importJob.kind as ImportKind);
    const validation: ImportValidation = { issues };

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

    await this.notify.add("notify", {
      userId: importJob.initiatedById,
      type: "success",
      title: "Import finished",
      body: `Import finished: ${summary.created} created, ${summary.failed} failed.`,
      link: `/imports/${importId}`,
    });

    this.logger.log(`import ${importId} completed: ${summary.created} created, ${summary.failed} failed`);
  }
}
