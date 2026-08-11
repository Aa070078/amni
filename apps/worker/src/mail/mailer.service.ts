import { Injectable, Logger } from "@nestjs/common";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ConfigService } from "@nestjs/config";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Sends rendered mail. Dev uses the `console` provider (logs the message);
 * when `MAIL_PROVIDER=smtp` and `SMTP_HOST` is set the message goes out via
 * SMTP (nodemailer). Matches the mail contract in `infra/docker/.env.example`.
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly transporter: Transporter | undefined;

  constructor(private readonly config: ConfigService) {
    const provider = this.config.get<string>("MAIL_PROVIDER") ?? "console";
    const host = this.config.get<string>("SMTP_HOST");
    if (provider === "smtp" && host) {
      const port = Number(this.config.get<string>("SMTP_PORT") ?? 587);
      const user = this.config.get<string>("SMTP_USER");
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: user ? { user, pass: this.config.get<string>("SMTP_PASS") ?? "" } : undefined,
      });
    } else if (provider === "smtp") {
      this.logger.warn("MAIL_PROVIDER=smtp but SMTP_HOST is unset — falling back to console provider");
    }
  }

  baseUrl(): string {
    return (this.config.get<string>("PLATFORM_URL") ?? "http://localhost:3000").replace(/\/+$/, "");
  }

  from(): string {
    return this.config.get<string>("MAIL_FROM") ?? "Amni <no-reply@amni.local>";
  }

  async send(message: MailMessage): Promise<void> {
    if (this.transporter) {
      await this.transporter.sendMail({
        from: this.from(),
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });
      this.logger.log(`sent mail "${message.subject}" -> ${message.to}`);
      return;
    }
    this.logger.log(`[console-mail] to=${message.to} subject="${message.subject}"\n${message.text}`);
  }
}
