import { describe, expect, it } from "vitest";

import { CrmActivitiesService } from "./activities.service";
import { CrmNotificationsService } from "./notifications.service";

describe("CrmActivitiesService", () => {
  const createService = () => new CrmActivitiesService(new CrmNotificationsService());

  describe("list", () => {
    it("returns all activities by default", () => {
      const result = createService().list({ limit: 50 });

      expect(result.total).toBe(8);
    });

    it("filters by reference and kind", () => {
      const service = createService();
      const comments = service.list({ referenceType: "deal", referenceCode: "DL-0001", kind: "comment", limit: 50 });

      expect(comments.items.every((activity) => activity.kind === "comment")).toBe(true);
      expect(comments.total).toBe(1);
    });

    it("sorts newest first and honors the limit", () => {
      const result = createService().list({ limit: 3 });

      expect(result.items).toHaveLength(3);
      const dates = result.items.map((activity) => activity.createdAt);
      expect([...dates].sort().reverse()).toEqual(dates);
    });
  });

  describe("createComment", () => {
    it("detects @mentions from content and raises a notification", () => {
      const notifications = new CrmNotificationsService();
      const service = new CrmActivitiesService(notifications);

      const activity = service.createComment({
        referenceType: "deal",
        referenceCode: "DL-0001",
        content: "Thanks @Theo Lindqvist for the margin analysis.",
      });

      expect(activity.mentions).toEqual(["Theo Lindqvist"]);
      expect(notifications.list(undefined).unreadCount).toBe(1);
      expect(notifications.list(undefined).items[0].title).toContain("mentioned you");
    });

    it("prefers explicit mentions over content parsing", () => {
      const service = createService();
      const activity = service.createComment({
        referenceType: "deal",
        referenceCode: "DL-0001",
        content: "No mention here",
        mentions: ["Maya Chen"],
      });

      expect(activity.mentions).toEqual(["Maya Chen"]);
    });

    it("prepends the new activity", () => {
      const service = createService();
      const before = service.list({ limit: 50 }).total;

      service.createComment({ referenceType: "deal", referenceCode: "DL-0001", content: "Adding a note." });

      expect(service.list({ limit: 50 }).total).toBe(before + 1);
    });
  });

  describe("createStatusActivity", () => {
    it("builds a from → to message", () => {
      const activity = createService().createStatusActivity({
        referenceType: "deal",
        referenceCode: "DL-0001",
        from: "proposal",
        to: "negotiation",
      });

      expect(activity.kind).toBe("status_change");
      expect(activity.content).toBe("proposal → negotiation");
    });

    it("falls back when no from stage is given", () => {
      const activity = createService().createStatusActivity({
        referenceType: "deal",
        referenceCode: "DL-0001",
        to: "won",
      });

      expect(activity.content).toBe("Stage changed to won");
    });
  });
});
