import { beforeEach, describe, expect, it, vi } from "vitest";

import { WizardService } from "./wizard.service";
import { SettingsService } from "../settings/settings.service";

vi.mock("@amni/db", () => ({
  prisma: {
    company: {
      upsert: vi.fn(async (args: { where: { slug: string } }) => ({
        id: "company-1",
        slug: args.where.slug,
        status: "READY",
      })),
    },
    tenant: {
      upsert: vi.fn(async () => ({ id: "tenant-1", status: "ACTIVE" })),
    },
    membership: {
      upsert: vi.fn(async () => ({ id: "membership-1", platformRole: "OWNER" })),
    },
  },
}));

describe("WizardService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createService = () => new WizardService(new SettingsService());

  describe("draft", () => {
    it("returns a seeded default draft", () => {
      const draft = createService().draft();

      expect(draft.company.name).toBe("Demo Co.");
      expect(draft.regional.currency).toBe("GBP");
      expect(draft.currentStep).toBe("company");
    });
  });

  describe("save", () => {
    it("merges partial updates onto the draft", () => {
      const service = createService();
      const draft = service.save({
        company: { name: "Serenity Interiors Ltd", industry: "Interior fit-out" },
        currentStep: "regional",
      });

      expect(draft.company.name).toBe("Serenity Interiors Ltd");
      expect(draft.company.industry).toBe("Interior fit-out");
      expect(draft.company.country).toBe("GB");
      expect(draft.currentStep).toBe("regional");
    });
  });

  describe("submit", () => {
    it("provisions a company, tenant and membership and adapts settings", async () => {
      const settings = new SettingsService();
      const service = new WizardService(settings);
      const result = await service.submit({ id: "user-1", email: "demo@amni.dev" });

      expect(result.status).toBe("ready");
      expect(settings.company().name).toBe("Demo Co.");
      expect(settings.company().currency).toBe("GBP");
      expect(service.status()).toEqual({ status: "ready" });
    });
  });

  describe("status", () => {
    it("reports pending before submission", () => {
      const status = createService().status();

      expect(status.status).toBe("pending");
    });
  });
});
