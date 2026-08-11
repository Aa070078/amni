import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { describe, expect, it, vi } from "vitest";

import { MailerService } from "./mailer.service";
import nodemailer from "nodemailer";

vi.mock("nodemailer", () => ({ default: { createTransport: vi.fn() } }));

const makeConfig = (env: Record<string, string>) =>
  new ConfigService({
    ...{ NODE_ENV: "test" },
    ...env,
  });

describe("MailerService", () => {
  it("defaults to the console provider and logs the message", async () => {
    const log = vi.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
    const mailer = new MailerService(makeConfig({}));

    await mailer.send({ to: "ann@acme.co", subject: "Hi", html: "<p>Hi</p>", text: "Hi" });

    expect(log).toHaveBeenCalledWith(expect.stringContaining("[console-mail] to=ann@acme.co"));
  });

  it("uses the console provider when MAIL_PROVIDER is unset and SMTP_HOST is empty", () => {
    const mailer = new MailerService(makeConfig({ SMTP_HOST: "" }));
    expect(mailer).toBeDefined();
  });

  it("builds an smtp transport when MAIL_PROVIDER=smtp and SMTP_HOST is set", async () => {
    const createTransport = vi.mocked(nodemailer.createTransport);
    const sendMail = vi.fn(async () => ({ messageId: "m1" }));
    createTransport.mockReturnValue({ sendMail } as never);

    const mailer = new MailerService(
      makeConfig({ MAIL_PROVIDER: "smtp", SMTP_HOST: "smtp.test", SMTP_PORT: "587", SMTP_USER: "u", SMTP_PASS: "p" }),
    );

    await mailer.send({ to: "ann@acme.co", subject: "Hi", html: "<p>Hi</p>", text: "Hi" });

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ host: "smtp.test", port: 587, secure: false }),
    );
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "ann@acme.co", subject: "Hi", from: "Amni <no-reply@amni.local>" }),
    );
  });

  it("exposes a normalized base url", () => {
    const mailer = new MailerService(makeConfig({ PLATFORM_URL: "https://app.amni.dev/" }));
    expect(mailer.baseUrl()).toBe("https://app.amni.dev");
  });

  it("defaults base url and from when unset", () => {
    const mailer = new MailerService(makeConfig({}));
    expect(mailer.baseUrl()).toBe("http://localhost:3000");
    expect(mailer.from()).toBe("Amni <no-reply@amni.local>");
  });
});
