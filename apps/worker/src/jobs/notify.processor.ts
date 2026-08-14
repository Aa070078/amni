import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { prisma } from "@amni/db";
import { BullQueue } from "@amni/shared";
import type { NotificationType } from "@amni/shared";
import type { Job } from "bullmq";

export interface NotifyJobPayload {
  userId?: string;
  tenantId?: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}

@Processor(BullQueue.NOTIFY)
export class NotifyProcessor extends WorkerHost {
  private readonly logger = new Logger(NotifyProcessor.name);

  async process(job: Job<NotifyJobPayload>) {
    const { userId, type, title, body, link } = job.data;

    if (!userId) {
      this.logger.warn(`notification "${type}: ${title}" dropped — no user target`);
      return;
    }

    await prisma.notification.create({
      data: { userId, type, title, body, link },
    });

    this.logger.log(`notification ${type} persisted for user ${userId}`);
  }
}
