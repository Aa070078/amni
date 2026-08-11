import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";

import { BullQueue } from "@amni/shared";
import type { MailJob } from "@amni/shared";

@Injectable()
export class MailService {
  constructor(@InjectQueue(BullQueue.MAIL) private readonly queue: Queue<MailJob>) {}

  async enqueue(job: MailJob): Promise<void> {
    await this.queue.add(job.template, job, {
      attempts: 5,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: { age: 60 * 60 * 24, count: 1000 },
      removeOnFail: { age: 60 * 60 * 24 * 7 },
    });
  }
}
