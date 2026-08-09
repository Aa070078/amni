import { describe, expect, it } from "vitest";
import { ErrorCode } from "@amni/shared";

import { SettingsService } from "./settings.service";

describe("SettingsService", () => {
  const createService = () => new SettingsService();

  describe("company", () => {
    it("returns the company profile", () => {
      const company = createService().company();

      expect(company.name).toBe("Demo Co.");
      expect(company.slug).toBe("demo-co");
      expect(company.currency).toBe("GBP");
    });

    it("updates editable fields", () => {
      const service = createService();
      const company = service.updateCompany({ name: "Demo Co. Renamed", website: "https://new.example" });

      expect(company.name).toBe("Demo Co. Renamed");
      expect(company.website).toBe("https://new.example");
      expect(company.slug).toBe("demo-co");
    });
  });

  describe("team", () => {
    it("lists members", () => {
      const team = createService().team();

      expect(team.length).toBe(4);
      expect(team[0].role).toBe("OWNER");
    });

    it("invites a member and rejects duplicates", () => {
      const service = createService();
      const member = service.invite({ email: "new@amni.dev", firstName: "Nadia", role: "MEMBER" });

      expect(member.status).toBe("invited");
      expect(service.team().length).toBe(5);

      expect(() => service.invite({ email: "new@amni.dev", firstName: "Nadia", role: "MEMBER" })).toThrowError(
        expect.objectContaining({ code: ErrorCode.CONFLICT }),
      );
    });

    it("updates a member role", () => {
      const service = createService();
      const member = service.updateMember("usr-3", { role: "ACCOUNTANT" });

      expect(member.role).toBe("ACCOUNTANT");
    });

    it("throws not_found for an unknown member", () => {
      expect(() => createService().updateMember("usr-999", { role: "ADMIN" })).toThrowError(
        expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
      );
    });
  });

  describe("roles", () => {
    it("counts members per role", () => {
      const roles = createService().roles();

      expect(roles.find((role) => role.key === "OWNER").members).toBe(1);
      expect(roles.find((role) => role.key === "ADMIN").members).toBe(1);
      expect(roles.find((role) => role.key === "MEMBER").members).toBe(0);
    });
  });

  describe("plan", () => {
    it("returns the current plan", () => {
      const plan = createService().plan();

      expect(plan.plan.code).toBe("growth");
      expect(plan.billingPeriod).toBe("monthly");
      expect(plan.seatsUsed).toBe(4);
    });

    it("switches billing period and recomputes next payment", () => {
      const service = createService();
      const plan = service.changeBilling({ billingPeriod: "yearly" });

      expect(plan.billingPeriod).toBe("yearly");
      expect(plan.nextPayment?.amount).toBe(470);
    });
  });

  describe("integrations", () => {
    it("lists integrations", () => {
      const integrations = createService().integrations();

      expect(integrations.length).toBe(6);
      expect(integrations.some((integration) => integration.connected)).toBe(true);
    });

    it("toggles an integration connection state", () => {
      const service = createService();
      const toggled = service.toggleIntegration("plaid");

      expect(toggled.connected).toBe(true);
      expect(toggled.status).toBe("connected");
    });

    it("throws not_found for an unknown integration", () => {
      expect(() => createService().toggleIntegration("nope")).toThrowError(
        expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
      );
    });
  });

  describe("profile", () => {
    it("returns the current user profile", () => {
      const profile = createService().profile({ id: "usr-1", email: "demo@amni.dev" });

      expect(profile.email).toBe("demo@amni.dev");
      expect(profile.firstName).toBe("Amara");
    });

    it("updates editable profile fields", () => {
      const service = createService();
      const profile = service.updateProfile({ id: "usr-1", email: "demo@amni.dev" }, { firstName: "Aria" });

      expect(profile.firstName).toBe("Aria");
      expect(profile.email).toBe("demo@amni.dev");
    });
  });
});
