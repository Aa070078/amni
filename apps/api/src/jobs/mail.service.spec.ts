import { describe, expect, it, vi } from "vitest";
import type { Queue } from "bullmq";

import { MailTemplate, type MailJob } from "@amni/shared";
import { MailService } from "./mail.service";

describe("MailService", () => {
  it("enqueues a mail job with retry/cleanup options", async () => {
    const add = vi.fn(async () => ({}) as never);
    const service = new MailService({ add } as unknown as Queue<MailJob>);

    await service.enqueue({
      template: MailTemplate.WELCOME,
      to: "ann@acme.co",
      firstName: "Ann",
      companyName: "Acme",
    });

    expect(add).toHaveBeenCalledWith(
      "welcome",
      expect.objectContaining({ to: "ann@acme.co", firstName: "Ann", companyName: "Acme" }),
      expect.objectContaining({ attempts: 5 }),
    );
  });

  it("enqueues a reset job under the reset template name", async () => {
    const add = vi.fn(async () => ({}) as never);
    const service = new MailService({ add } as unknown as Queue<MailJob>);

    await service.enqueue({ template: MailTemplate.RESET, to: "ann@acme.co", firstName: "Ann", token: "tok1" });

    expect(add).toHaveBeenCalledWith("reset", expect.objectContaining({ token: "tok1" }), expect.any(Object));
  });
});
