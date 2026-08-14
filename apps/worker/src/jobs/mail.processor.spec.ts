import { describe, expect, it, vi } from "vitest";
import type { Job } from "bullmq";

import type { MailJob } from "@amni/shared";
import { MailProcessor } from "./mail.processor";

const asJob = (data: MailJob) => ({ id: "1", name: "welcome", data } as unknown as Job<MailJob>);

describe("MailProcessor", () => {
  it("renders and sends a welcome job", async () => {
    const send = vi.fn(async () => undefined);
    const processor = new MailProcessor({ baseUrl: () => "http://localhost:3000", send } as never);

    await processor.process(
      asJob({ template: "welcome", to: "ann@acme.co", firstName: "Ann", companyName: "Acme" }),
    );

    expect(send).toHaveBeenCalledTimes(1);
    const [message] = send.mock.calls[0];
    expect(message.subject).toBe("Welcome to Amni, Ann!");
    expect(message.to).toBe("ann@acme.co");
    expect(message.html).toContain("Acme");
  });

  it("renders and sends a verification job with a token link", async () => {
    const send = vi.fn(async () => undefined);
    const processor = new MailProcessor({ baseUrl: () => "https://app.amni.dev", send } as never);

    await processor.process(asJob({ template: "verification", to: "ann@acme.co", firstName: "Ann", token: "tok1" }));

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].html).toContain("/verify?token=tok1");
  });

  it("drops invalid jobs without sending", async () => {
    const send = vi.fn(async () => undefined);
    const processor = new MailProcessor({ baseUrl: () => "http://localhost:3000", send } as never);

    await expect(processor.process({ id: "1", data: { template: "welcome", to: "not-an-email" } } as never)).resolves.toBeUndefined();
    expect(send).not.toHaveBeenCalled();
  });
});
