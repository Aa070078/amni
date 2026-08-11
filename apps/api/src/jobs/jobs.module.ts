import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ConfigService } from "@nestjs/config";

import { BullQueue } from "@amni/shared";
import { MailService } from "./mail.service";

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
  ],
  providers: [MailService],
  exports: [MailService],
})
export class JobsModule {}
