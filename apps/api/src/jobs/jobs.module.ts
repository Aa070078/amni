import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ConfigService } from "@nestjs/config";

import { BullQueue } from "@amni/shared";
import { MailService } from "./mail.service";

/**
 * Owns the BullMQ connection and the queues the API writes to. The worker
 * consumes the same queues over Redis. Add new queues here as they are needed.
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get<string>("REDIS_URL") ?? "redis://localhost:6379",
        },
      }),
    }),
    BullModule.registerQueue({ name: BullQueue.MAIL }),
    BullModule.registerQueue({ name: BullQueue.IMPORTS }),
  ],
  providers: [MailService],
  exports: [MailService, BullModule],
})
export class JobsModule {}
