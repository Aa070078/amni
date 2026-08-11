import { describe, expect, it } from "vitest";
import { crmDialInputSchema, ErrorCode } from "@amni/shared";

import { CrmSettingsService } from "./settings.service";
import { CrmCallLogsService } from "./call-logs.service";
import { CrmActivitiesService } from "./activities.service";
import { CrmNotificationsService } from "./notifications.service";
import { ApiException } from "../common/api.exception";

describe("CrmSettingsService", () => {
  const createService = () =>
    new CrmSettingsService(new CrmCallLogsService(), new CrmActivitiesService(new CrmNotificationsService()));

  describe("get", () => {
    it("returns default settings", () => {
      const settings = createService().get();

      expect(settings.brandName).toBe("Amni CRM");
      expect(settings.pipelineStages).toHaveLength(6);
      expect(settings.telephony.provider).toBe("internal");
      expect(settings.telephony.enabled).toBe(false);
    });
  });

  describe("update", () => {
    it("applies partial updates without touching other sections", () => {
      const service = createService();
      const updated = service.update({ brandName: "Acme Interior Group", defaultOwner: "Theo Lindqvist" });

      expect(updated.brandName).toBe("Acme Interior Group");
      expect(updated.defaultOwner).toBe("Theo Lindqvist");
      expect(updated.whatsapp.defaultMessage).toContain("Hi {{contact_name}}");
      expect(updated.telephony.enabled).toBe(false);
      expect(updated.updatedAt).toBeDefined();
    });

    it("merges nested telephony updates", () => {
      const service = createService();
      const updated = service.update({ telephony: { provider: "twilio", enabled: true } });

      expect(updated.telephony.provider).toBe("twilio");
      expect(updated.telephony.enabled).toBe(true);
      expect(updated.telephony.number).toBe("");
    });
  });

  describe("dial", () => {
    it("returns a ringing call through the built-in dialer when telephony is disabled", () => {
      const service = createService();
      const result = service.dial({ phoneNumber: "+1 415-555-0142" });

      expect(result.status).toBe("ringing");
      expect(result.provider).toBe("internal");
      expect(result.message).toContain("built-in dialer");
      expect(result.callId).toBeDefined();
    });

    it("routes through the configured provider when telephony is enabled", () => {
      const service = createService();
      service.update({ telephony: { provider: "twilio", enabled: true } });

      const result = service.dial({ phoneNumber: "+1 415-555-0142" });
      expect(result.provider).toBe("twilio");
    });

    it("logs an activity against the referenced record", () => {
      const notifications = new CrmNotificationsService();
      const activities = new CrmActivitiesService(notifications);
      const service = new CrmSettingsService(new CrmCallLogsService(), activities);

      service.dial({ phoneNumber: "+1 415-555-0142", referenceType: "deal", referenceCode: "DL-0001" });

      const list = activities.list({ referenceType: "deal", referenceCode: "DL-0001", limit: 10 });
      expect(list.items[0].kind).toBe("call");
      expect(list.items[0].content).toContain("Dialed +1 415-555-0142");
    });
  });

  describe("errors", () => {
    it("rejects unknown reference types via schema at the controller boundary", () => {
      expect(() => crmDialInputSchema.parse({ phoneNumber: "+1", referenceType: "bogus" })).toThrow();
    });

    it("keeps NOT_FOUND export import healthy", () => {
      expect(ErrorCode.NOT_FOUND).toBeDefined();
      const ex = new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: "x" });
      expect(ex.status).toBe(404);
    });
  });
});
