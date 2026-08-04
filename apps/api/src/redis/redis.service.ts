import { Injectable, Logger, type OnModuleDestroy } from "@nestjs/common";
import { Redis } from "ioredis";

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor() {
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    this.client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
    });
    this.client.on("error", (err) => this.logger.warn(`redis error: ${err.message}`));
  }

  get(): Redis {
    return this.client;
  }

  async onModuleDestroy() {
    if (this.client.status !== "end") {
      await this.client.quit().catch(() => undefined);
    }
  }
}
