import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { BullQueue } from "@amni/shared";
import type { Job } from "bullmq";

export interface NotifyJobPayload {
  userId?: string;
  tenantId?: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
}

@Processor(BullQueue.NOTIFY)
export class NotifyProcessor extends WorkerHost {
  private readonly logger = new Logger(NotifyProcessor.name);

  async process(job: Job<NotifyJobPayload>) {
    const { type, userId } = job.data;
    this.logger.log(`notification ${type} -> user ${userId ?? "(none)"}`);
    // M4: persist in-app notifications (Notification model).
    throw new Error("notify processor not implemented");
  }
}
