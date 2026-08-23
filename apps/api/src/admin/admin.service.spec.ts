import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiException } from "../common/api.exception";
import { AdminService } from "./admin.service";

const { mocks } = vi.hoisted(() => {
  const tenantRow = {
    id: "11111111-1111-1111-1111-111111111111",
    siteName: "demo-co",
    siteUrl: "https://demo-co.amni.dev",
    status: "ACTIVE",
    planTier: "TRIAL",
    erpnextVersion: "16.30.0",
    hrmsInstalled: false,
    region: "us",
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    company: {
      name: "Demo Co",
      slug: "demo-co",
      status: "READY",
      industry: "Tech",
      country: "US",
      subscriptions: [
        { status: "TRIAL", trialEndsAt: new Date("2026-09-01T00:00:00.000Z"), plan: { name: "Trial", tier: "TRIAL" } },
      ],
      memberships: [
        {
          platformRole: "OWNER",
          createdAt: new Date("2026-08-01T00:00:00.000Z"),
          user: { id: "u1", email: "demo@amni.dev", firstName: "Demo", lastName: "User" },
        },
      ],
    },
    erpInstance: { host: "localhost", cluster: "default", capacityGroup: "shared", health: "HEALTHY" },
    provisioningJobs: [],
  };

  return {
    mocks: {
      tenant: {
        count: vi.fn(async () => 1),
        findMany: vi.fn(async () => [tenantRow]),
        findUnique: vi.fn(async () => null),
        groupBy: vi.fn(async (args: { by: string }) =>
          args.by === "status" ? [{ status: "ACTIVE", _count: { _all: 1 } }] : [{ planTier: "TRIAL", _count: { _all: 1 } }],
        ),
      },
      user: { count: vi.fn(async () => 2) },
      company: { count: vi.fn(async () => 1) },
      subscription: {
        count: vi.fn(async (args: { where?: { status?: string } }) =>
          args?.where?.status === "TRIAL" ? 0 : 1,
        ),
      },
      provisioningJob: { count: vi.fn(async () => 0) },
    },
  };
});

vi.mock("@amni/db", () => ({ prisma: mocks }));

describe("AdminService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const service = new AdminService();

  describe("summary", () => {
    it("aggregates platform-wide counters", async () => {
      const summary = await service.summary();

      expect(summary.totalUsers).toBe(2);
      expect(summary.totalCompanies).toBe(1);
      expect(summary.totalTenants).toBe(1);
      expect(summary.activeSubscriptions).toBe(1);
      expect(summary.trialsExpiringSoon).toBe(0);
      expect(summary.provisioningFailures).toBe(0);
    });

    it("includes the most recent tenants with owner email", async () => {
      const summary = await service.summary();

      expect(summary.recentTenants).toHaveLength(1);
      expect(summary.recentTenants[0].companyName).toBe("Demo Co");
      expect(summary.recentTenants[0].ownerEmail).toBe("demo@amni.dev");
      expect(summary.recentTenants[0].planTier).toBe("trial");
      expect(summary.recentTenants[0].health).toBe("HEALTHY");
    });
  });

  describe("listTenants", () => {
    it("paginates and maps rows", async () => {
      const result = await service.listTenants({ page: 1, pageSize: 20 });

      expect(result.meta.total).toBe(1);
      expect(result.items[0].companySlug).toBe("demo-co");
      expect(result.items[0].memberCount).toBe(1);
      expect(result.items[0].subscriptionStatus).toBe("TRIAL");
    });

    it("forwards status and search filters to the query", async () => {
      const { prisma } = await import("@amni/db");
      await service.listTenants({ page: 1, pageSize: 20, status: "ACTIVE", q: "demo" });

      const where = (prisma.tenant.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0].where;
      expect(where.status).toBe("ACTIVE");
      expect(where.OR).toBeDefined();
    });
  });

  describe("tenantDetail", () => {
    it("throws 404 for an unknown tenant", async () => {
      await expect(service.tenantDetail("11111111-1111-1111-1111-111111111111")).rejects.toBeInstanceOf(ApiException);
    });
  });
});
