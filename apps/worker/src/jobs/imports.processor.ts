import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { BullQueue } from "@amni/shared";
import type { Job } from "bullmq";

export interface ImportJobPayload {
  importId: string;
  tenantId: string;
}

@Processor(BullQueue.IMPORTS)
export class ImportsProcessor extends WorkerHost {
  private readonly logger = new Logger(ImportsProcessor.name);

  async process(job: Job<ImportJobPayload>) {
    const { importId, tenantId } = job.data;
    this.logger.log(`import ${importId} for tenant ${tenantId}`);
    // M3: stage-based data import via ERPNext Data Import.
    throw new Error("imports processor not implemented");
  }
}
