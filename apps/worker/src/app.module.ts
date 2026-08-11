import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ConfigModule, ConfigService } from "@nestjs/config";

import { BullQueue } from "@amni/shared";
import { ProvisioningProcessor } from "./jobs/provisioning.processor";
import { ImportsProcessor } from "./jobs/imports.processor";
import { MailProcessor } from "./jobs/mail.processor";
import { NotifyProcessor } from "./jobs/notify.processor";
import { DefaultProcessor } from "./jobs/default.processor";
import { MailerService } from "./mail/mailer.service";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: [".env.local", ".env"],
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get<string>("REDIS_URL") ?? "redis://localhost:6379",
        },
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: "exponential", delay: 5_000 },
          removeOnComplete: { age: 60 * 60 * 24, count: 1000 },
          removeOnFail: { age: 60 * 60 * 24 * 7 },
        },
      }),
    }),
    BullModule.registerQueue(
      { name: BullQueue.PROVISIONING },
      { name: BullQueue.IMPORTS },
      { name: BullQueue.MAIL },
      { name: BullQueue.NOTIFY },
      { name: BullQueue.DEFAULT },
    ),
  ],
  providers: [ProvisioningProcessor, ImportsProcessor, MailProcessor, NotifyProcessor, DefaultProcessor, MailerService],
})
export class AppModule {}
