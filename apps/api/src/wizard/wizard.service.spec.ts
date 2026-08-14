import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Queue } from "bullmq";

import { WizardService } from "./wizard.service";
import { SettingsService } from "../settings/settings.service";
import { PlansService } from "../plans/plans.service";
import { ProvisioningService } from "../provisioning/provisioning.service";

vi.mock("@amni/db", () => ({
  prisma: {
    company: {
      upsert: vi.fn(async (args: { where: { slug: string } }) => ({
        id: "company-1",
        slug: args.where.slug,
        status: "ONBOARDING",
      })),
    },
    tenant: {
      upsert: vi.fn(async () => ({
        id: "tenant-1",
        status: "CREATING",
        siteUrl: "https://demo-co.amni.dev",
      })),
      update: vi.fn(async () => ({})),
    },
    membership: {
      upsert: vi.fn(async () => ({ id: "membership-1", platformRole: "OWNER" })),
      findFirst: vi.fn(async () => ({ company: { tenant: { status: "PROVISIONING" } } })),
    },
    subscription: {
      findFirst: vi.fn(async () => null),
      create: vi.fn(async () => ({ id: "subscription-1" })),
      update: vi.fn(async () => ({})),
    },
    plan: {
      findUnique: vi.fn(async () => ({
        id: "plan-1",
        code: "trial",
        name: "Trial",
        tier: "TRIAL",
        price: { toNumber: () => 0 },
        limits: {},
        features: {},
        isActive: true,
      })),
    },
    provisioningJob: {
      findUnique: vi.fn(async () => null),
      create: vi.fn(async () => ({ id: "job-1" })),
    },
    auditLog: {
      create: vi.fn(async () => ({})),
    },
  },
}));

describe("WizardService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createService = () => {
    const settings = new SettingsService();
    const plans = new PlansService();
    const queue = { add: vi.fn() } as unknown as Queue;
    const provisioning = new ProvisioningService(queue);
    return { service: new WizardService(settings, plans, provisioning), settings, queue };
  };

  describe("draft", () => {
    it("returns a seeded default draft", () => {
      const { service } = createService();
      const draft = service.draft();

      expect(draft.company.name).toBe("Demo Co.");
      expect(draft.regional.currency).toBe("GBP");
      expect(draft.currentStep).toBe("company");
    });
  });

  describe("save", () => {
    it("merges partial updates onto the draft", () => {
      const { service } = createService();
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
    it("selects the trial plan, creates company/tenant/membership and enqueues provisioning", async () => {
      const { service, settings, queue } = createService();
      const result = await service.submit({ id: "user-1", email: "demo@amni.dev" });

      expect(result.status).toBe("provisioning");
      expect(settings.company().name).toBe("Demo Co.");
      expect(settings.company().currency).toBe("GBP");
      expect(queue.add).toHaveBeenCalled();
    });

    it("accepts an explicit plan code", async () => {
      const { service } = createService();
      await service.submit({ id: "user-1", email: "demo@amni.dev" }, { planCode: "growth" });
    });
  });

  describe("status", () => {
    it("reports provisioning while the tenant is being set up", async () => {
      const { service } = createService();
      const status = await service.status();

      expect(status.status).toBe("provisioning");
    });
  });
});
