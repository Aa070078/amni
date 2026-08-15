import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { BullQueue } from "@amni/shared";
import type { Job } from "bullmq";

import { createProvisioningDriver } from "../provisioning/drivers/driver";
import { runProvisioningJob } from "../provisioning/state-machine";

export interface ProvisioningJobPayload {
  jobId: string;
  tenantId: string;
  idempotencyKey: string;
}

@Processor(BullQueue.PROVISIONING)
export class ProvisioningProcessor extends WorkerHost {
  private readonly logger = new Logger(ProvisioningProcessor.name);

  async process(job: Job<ProvisioningJobPayload>) {
    const { jobId, tenantId } = job.data;
    this.logger.log(`provisioning job ${jobId} for tenant ${tenantId} (attempt ${job.attemptsMade + 1})`);

    const driver = createProvisioningDriver();
    return runProvisioningJob({ jobId, tenantId, driver, logger: this.logger });
  }
}
