import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { BullQueue } from "@amni/shared";
import type { Job } from "bullmq";

export interface MailJobPayload {
  to: string;
  template: string;
  context: Record<string, unknown>;
}

@Processor(BullQueue.MAIL)
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  async process(job: Job<MailJobPayload>) {
    const { to, template } = job.data;
    this.logger.log(`mail ${template} -> ${to}`);
    // M2: verification / reset / welcome / import-summary emails (dev: console).
    throw new Error("mail processor not implemented");
  }
}
