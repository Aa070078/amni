import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorCode } from "@amni/shared";

import { SettingsService } from "./settings.service";

let companyRecord: Record<string, unknown>;
let userRecord: Record<string, unknown>;

vi.mock("@amni/db", () => ({
  Prisma: {},
  prisma: {
    membership: { findFirst: vi.fn(async () => ({ companyId: "company-1", company: companyRecord })) },
    company: { update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => Object.assign(companyRecord, data)) },
    tenant: {
      update: vi.fn(async ({ data }: { data: { locale: Record<string, unknown> } }) => {
        (companyRecord.tenant as Record<string, unknown>).locale = data.locale;
      }),
    },
    user: {
      findUnique: vi.fn(async () => userRecord),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => Object.assign(userRecord, data)),
    },
  },
}));

describe("SettingsService", () => {
  const createService = () => new SettingsService();

  beforeEach(() => {
    companyRecord = {
      id: "company-1",
      name: "Demo Co.",
      legalName: "Demo Co. Ltd",
      slug: "demo-co",
      industry: "Furniture & interiors",
      country: "GB",
      taxId: "GB123456789",
      address: "Bristol",
      email: "hello@demo.test",
      phone: null,
      website: "https://demo.test",
      fiscalYearStart: "2025-01-01",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      tenant: { id: "tenant-1", locale: { currency: "GBP", timezone: "Europe/London" } },
    };
    userRecord = {
      email: "demo@amni.dev",
      firstName: "Amara",
      lastName: "Osei",
      avatarUrl: null,
      jobTitle: "Operations Lead",
      locale: { currency: "GBP", timezone: "Europe/London", dateFormat: "DD-MM-YYYY", numberFormat: "1,000.00", country: "GB", language: "en" },
    };
  });

  describe("company", () => {
    it("returns the authenticated user's company profile", async () => {
      const company = await createService().company("usr-1");

      expect(company.name).toBe("Demo Co.");
      expect(company.slug).toBe("demo-co");
      expect(company.currency).toBe("GBP");
    });

    it("updates editable fields", async () => {
      const service = createService();
      const company = await service.updateCompany("usr-1", { name: "Demo Co. Renamed", website: "https://new.example" });

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
    it("returns the current user profile", async () => {
      const profile = await createService().profile({ id: "usr-1", email: "demo@amni.dev" });

      expect(profile.email).toBe("demo@amni.dev");
      expect(profile.firstName).toBe("Amara");
    });

    it("updates editable profile fields", async () => {
      const service = createService();
      const profile = await service.updateProfile({ id: "usr-1", email: "demo@amni.dev" }, { firstName: "Aria" });

      expect(profile.firstName).toBe("Aria");
      expect(profile.email).toBe("demo@amni.dev");
    });
  });
});
