import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@amni/db";
import { NotifyProcessor } from "./notify.processor";

vi.mock("@amni/db", () => ({
  prisma: {
    notification: { create: vi.fn() },
  },
}));

describe("NotifyProcessor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.notification.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "ntf-1" });
  });

  const createProcessor = () => new NotifyProcessor();

  it("persists a notification for the target user", async () => {
    await createProcessor().process({
      data: {
        userId: "user-1",
        type: "success",
        title: "Import finished",
        body: "Import finished: 2 created, 0 failed.",
        link: "/imports/job-1",
      },
    } as never);

    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        type: "success",
        title: "Import finished",
        body: "Import finished: 2 created, 0 failed.",
        link: "/imports/job-1",
      },
    });
  });

  it("drops notifications without a user target", async () => {
    await createProcessor().process({
      data: { type: "system", title: "Backup completed" },
    } as never);

    expect(prisma.notification.create).not.toHaveBeenCalled();
  });
});
