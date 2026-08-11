import { describe, expect, it } from "vitest";

import { CrmWhatsappService } from "./whatsapp.service";
import { CrmActivitiesService } from "./activities.service";
import { CrmNotificationsService } from "./notifications.service";

describe("CrmWhatsappService", () => {
  const createService = () => new CrmWhatsappService(new CrmActivitiesService(new CrmNotificationsService()));

  describe("send", () => {
    it("prepends the sent message and returns it", () => {
      const service = createService();
      const { message } = service.send({ to: "+1 555-0100", message: "Hi there", referenceType: "deal", referenceCode: "DL-0001" });

      expect(message.id).toMatch(/^wa-/);
      expect(message.status).toBe("sent");
      expect(service.history({}).items[0].id).toBe(message.id);
    });

    it("logs a whatsapp activity when linked to a record", () => {
      const notifications = new CrmNotificationsService();
      const activities = new CrmActivitiesService(notifications);
      const service = new CrmWhatsappService(activities);

      service.send({ to: "+49 30 1234 5678", message: "Load ratings below.", referenceType: "deal", referenceCode: "DL-0003" });

      const list = activities.list({ referenceType: "deal", referenceCode: "DL-0003", limit: 10 });
      expect(list.items[0].kind).toBe("whatsapp");
      expect(list.items[0].content).toContain("Load ratings below");
    });

    it("skips the activity when not linked to a record", () => {
      const notifications = new CrmNotificationsService();
      const activities = new CrmActivitiesService(notifications);
      const service = new CrmWhatsappService(activities);
      const before = activities.list({ limit: 50 }).total;

      service.send({ to: "+1 555-0100", message: "Standalone message" });

      expect(activities.list({ limit: 50 }).total).toBe(before);
    });
  });

  describe("history", () => {
    it("filters by reference", () => {
      const service = createService();
      const byDeal = service.history({ referenceType: "deal", referenceCode: "DL-0001" });

      expect(byDeal.items).toHaveLength(1);
      expect(byDeal.items[0].to).toBe("+1 415-555-0142");
    });

    it("respects the limit", () => {
      const result = createService().history({ limit: 1 });

      expect(result.items).toHaveLength(1);
    });
  });
});
