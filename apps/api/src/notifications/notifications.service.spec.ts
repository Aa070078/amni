import { describe, expect, it } from "vitest";
import { ErrorCode } from "@amni/shared";

import { NotificationsService } from "./notifications.service";

describe("NotificationsService", () => {
  const createService = () => new NotificationsService();

  describe("list", () => {
    it("returns all notifications with the unread count", () => {
      const result = createService().list({});

      expect(result.items.length).toBeGreaterThan(0);
      expect(result.unreadCount).toBe(result.items.filter((notification) => !notification.read).length);
    });

    it("filters to unread only", () => {
      const result = createService().list({ unreadOnly: "true" });

      expect(result.items.every((notification) => !notification.read)).toBe(true);
      expect(result.items.length).toBe(result.unreadCount);
    });
  });

  describe("markRead", () => {
    it("marks a notification as read", () => {
      const service = createService();
      const target = service.list({ unreadOnly: "true" }).items[0];
      const notification = service.markRead(target.id);

      expect(notification.read).toBe(true);
    });

    it("throws not_found for an unknown notification", () => {
      expect(() => createService().markRead("ntf-missing")).toThrowError(
        expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
      );
    });
  });

  describe("markAllRead", () => {
    it("clears the unread count", () => {
      const service = createService();
      const result = service.markAllRead();

      expect(result.unreadCount).toBe(0);
      expect(result.items.every((notification) => notification.read)).toBe(true);
    });
  });
});
