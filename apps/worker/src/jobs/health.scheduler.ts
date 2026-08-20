import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, type OnModuleInit } from "@nestjs/common";
import { BullQueue } from "@amni/shared";
import type { Queue } from "bullmq";

@Injectable()
export class HealthScheduler implements OnModuleInit {
  constructor(@InjectQueue(BullQueue.DEFAULT) private readonly queue: Queue) {}

  async onModuleInit(): Promise<void> {
    await this.queue.add("tenant-health", {}, {
      jobId: "tenant-health",
      repeat: { every: 60_000 },
      removeOnComplete: true,
      removeOnFail: 100,
    });
  }
}
