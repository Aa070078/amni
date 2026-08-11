import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { BullQueue, mailJobSchema } from "@amni/shared";
import type { MailJob } from "@amni/shared";
import type { Job } from "bullmq";

// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { MailerService } from "../mail/mailer.service";
import { renderMail } from "../mail/templates";

@Processor(BullQueue.MAIL)
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private readonly mailer: MailerService) {
    super();
  }

  async process(job: Job<MailJob>) {
    const parsed = mailJobSchema.safeParse(job.data);
    if (!parsed.success) {
      this.logger.warn(`dropping invalid mail job: ${parsed.error.message}`);
      return;
    }
    const rendered = renderMail(parsed.data, this.mailer.baseUrl());
    await this.mailer.send({ to: parsed.data.to, ...rendered });
    this.logger.log(`mail ${parsed.data.template} -> ${parsed.data.to}`);
  }
}
