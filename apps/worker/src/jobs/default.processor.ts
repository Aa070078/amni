import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { BullQueue } from "@amni/shared";
import type { Job } from "bullmq";

@Processor(BullQueue.DEFAULT)
export class DefaultProcessor extends WorkerHost {
  private readonly logger = new Logger(DefaultProcessor.name);

  async process(job: Job) {
    this.logger.log(`default job ${job.id}`);
    // M8: scheduled cleanup, health checks, key rotation, backups.
    throw new Error("default processor not implemented");
  }
}
