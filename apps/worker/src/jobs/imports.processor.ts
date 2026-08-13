import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { BullQueue } from "@amni/shared";
import type { Job } from "bullmq";

import { createImportDriver } from "../imports/driver";
import { runImportJob } from "../imports/import-engine";

export interface ImportJobPayload {
  importId: string;
  tenantId: string;
}

@Processor(BullQueue.IMPORTS)
export class ImportsProcessor extends WorkerHost {
  private readonly logger = new Logger(ImportsProcessor.name);

  async process(job: Job<ImportJobPayload>) {
    const { importId, tenantId } = job.data;
    this.logger.log(`import job ${importId} for tenant ${tenantId} (attempt ${job.attemptsMade + 1})`);

    const driver = createImportDriver();
    await runImportJob({ jobId: importId, tenantId, driver, logger: this.logger });
  }
}
