import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorCode } from "@amni/shared";

import { prisma } from "@amni/db";
import { NotificationsService } from "./notifications.service";

vi.mock("@amni/db", () => ({
  prisma: {
    notification: {
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

const USER_ID = "user-1";

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "ntf-1",
    userId: USER_ID,
    type: "success",
    title: "Invoice INV-0003 paid",
    body: "Serenity Interiors paid $5,000.00 by bank transfer.",
    link: "/sales/invoices/INV-0003",
    readAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("NotificationsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.notification.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([row(), row({ id: "ntf-2", readAt: new Date("2026-01-02T00:00:00.000Z") })]);
    (prisma.notification.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);
  });

  const createService = () => new NotificationsService();

  describe("list", () => {
    it("returns the user's notifications with the unread count", async () => {
      const service = createService();
      const result = await service.list(USER_ID, {});

      expect(result.items).toHaveLength(2);
      expect(result.unreadCount).toBe(1);
      expect(result.items[0]).toMatchObject({ id: "ntf-1", read: false, type: "success" });
      expect(result.items[1].read).toBe(true);
      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    });

    it("filters to unread notifications when requested", async () => {
      const service = createService();
      await service.list(USER_ID, { unreadOnly: "true" });

      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: USER_ID, readAt: null },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    });
  });

  describe("markRead", () => {
    it("marks the user's notification as read", async () => {
      (prisma.notification.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });
      (prisma.notification.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(row({ readAt: new Date() }));

      const notification = await createService().markRead("ntf-1", USER_ID);

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: "ntf-1", userId: USER_ID },
        data: { readAt: expect.any(Date) },
      });
      expect(notification.read).toBe(true);
    });

    it("throws not_found for a notification outside the user's scope", async () => {
      (prisma.notification.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });

      await expect(createService().markRead("ntf-missing", USER_ID)).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });
  });

  describe("markAllRead", () => {
    it("clears the unread count for the user", async () => {
      (prisma.notification.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });
      (prisma.notification.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
      (prisma.notification.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        row({ readAt: new Date() }),
        row({ id: "ntf-2", readAt: new Date("2026-01-02T00:00:00.000Z") }),
      ]);

      const result = await createService().markAllRead(USER_ID);

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: USER_ID, readAt: null },
        data: { readAt: expect.any(Date) },
      });
      expect(result.unreadCount).toBe(0);
      expect(result.items.every((notification) => notification.read)).toBe(true);
    });
  });
});
