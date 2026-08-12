import { describe, expect, it } from "vitest";
import { ErrorCode } from "@amni/shared";

import { CrmNotificationsService } from "./notifications.service";
import { ApiException } from "../common/api.exception";

describe("CrmNotificationsService", () => {
  const createService = () => new CrmNotificationsService();

  describe("add / list", () => {
    it("adds an unread notification at the front", () => {
      const service = createService();
      const notification = service.add({ type: "info", title: "Mentioned you", body: "Body", href: "/sales/crm" });

      expect(notification.read).toBe(false);
      expect(service.list(undefined).unreadCount).toBe(1);
      expect(service.list(undefined).items[0].id).toBe(notification.id);
    });

    it("filters unread notifications only", () => {
      const service = createService();
      service.add({ type: "info", title: "First" });
      const second = service.add({ type: "warning", title: "Second" });
      service.markRead(second.id);

      const unread = service.list("true");
      expect(unread.items).toHaveLength(1);
      expect(unread.items[0].title).toBe("First");
    });
  });

  describe("markRead", () => {
    it("marks a single notification read", () => {
      const service = createService();
      const notification = service.add({ type: "info", title: "Mention" });

      const updated = service.markRead(notification.id);
      expect(updated.read).toBe(true);
      expect(service.list(undefined).unreadCount).toBe(0);
    });

    it("throws NOT_FOUND for an unknown id", () => {
      expect(() => createService().markRead("crm-ntf-999")).toThrowError(
        expect.objectContaining({ status: 404, code: ErrorCode.NOT_FOUND }),
      );
    });
  });

  describe("markAllRead", () => {
    it("clears the unread count", () => {
      const service = createService();
      service.add({ type: "info", title: "A" });
      service.add({ type: "info", title: "B" });

      const result = service.markAllRead();
      expect(result.unreadCount).toBe(0);
      expect(result.items.every((notification) => notification.read)).toBe(true);
    });
  });

  describe("errors", () => {
    it("keeps ApiException import healthy", () => {
      expect(new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: "x" }).code).toBe(ErrorCode.NOT_FOUND);
    });
  });
});
