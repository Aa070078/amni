import { describe, expect, it, vi } from "vitest";

import type { DomainRecordRepository } from "../common/domain-record.repository";
import { EsgService } from "./esg.service";

const user = { id: "user-1", email: "owner@example.com", role: "owner" };
const meta = { requestId: "request-1" };

describe("EsgService", () => {
  it("derives the overview from tenant-persisted records", async () => {
    const list = vi.fn(async (_user, _meta, _domain, type) => ({
      items: type === "metric"
        ? [{ code: "ESG-M01", pillar: "environmental", name: "GHG emissions", value: 42, unit: "tCO2e", period: "2026", status: "on_track", trend: "down" }]
        : type === "policy"
          ? [{ code: "POL-0001", name: "Ethics", status: "active" }]
          : type === "board_member"
            ? [{ code: "BRD-0001", name: "A", role: "Director", independence: "independent", since: "2025" }]
            : [{ code: "ESG-0001", period: "FY 2026", status: "published", pillarScore: { environmental: 80, social: 70, governance: 90, overall: 80 }, highlights: [], generatedAt: "2026-08-01T00:00:00.000Z" }],
      total: 1,
    }));
    const service = new EsgService({ list } as unknown as DomainRecordRepository);

    const overview = await service.overview(user, meta);

    expect(overview.carbonFootprint).toBe(42);
    expect(overview.policiesActive).toBe(1);
    expect(overview.latestReport?.code).toBe("ESG-0001");
    expect(list).toHaveBeenCalledTimes(4);
  });

  it("resolves detail through the tenant repository", async () => {
    const get = vi.fn().mockResolvedValue({ code: "POL-0001", name: "Ethics", status: "active" });
    const service = new EsgService({ get } as unknown as DomainRecordRepository);
    await expect(service.policyDetail(user, meta, "POL-0001")).resolves.toMatchObject({ name: "Ethics" });
    expect(get).toHaveBeenCalledWith(user, meta, "esg", "policy", "POL-0001");
  });

  it("filters persisted metrics by pillar and status", async () => {
    const list = vi.fn().mockResolvedValue({ items: [{ code: "ESG-M01", pillar: "environmental", name: "Emissions", value: 10, unit: "tCO2e", period: "2026", status: "on_track", trend: "down" }, { code: "ESG-M02", pillar: "social", name: "Turnover", value: 5, unit: "%", period: "2026", status: "behind", trend: "up" }], total: 2 });
    const result = await new EsgService({ list } as unknown as DomainRecordRepository).listMetrics(user, meta, { pillar: "social", status: "behind" });
    expect(result.map((item) => item.code)).toEqual(["ESG-M02"]);
  });

  it("returns empty, truthful overview values for a new tenant", async () => {
    const list = vi.fn().mockResolvedValue({ items: [], total: 0 });
    await expect(new EsgService({ list } as unknown as DomainRecordRepository).overview(user, meta)).resolves.toMatchObject({ carbonFootprint: 0, employees: 0, boardSize: 0, policiesActive: 0 });
  });

  it("lists policies from the tenant repository", async () => {
    const list = vi.fn().mockResolvedValue({ items: [{ code: "POL-0001", name: "Ethics", status: "active" }], total: 1 });
    await expect(new EsgService({ list } as unknown as DomainRecordRepository).listPolicies(user, meta)).resolves.toHaveLength(1);
  });

  it("lists board members from the tenant repository", async () => {
    const list = vi.fn().mockResolvedValue({ items: [{ code: "BRD-0001", name: "Director", role: "Chair", independence: "independent", since: "2025" }], total: 1 });
    await expect(new EsgService({ list } as unknown as DomainRecordRepository).listBoard(user, meta)).resolves.toMatchObject([{ independence: "independent" }]);
  });

  it("orders reports newest first", async () => {
    const list = vi.fn().mockResolvedValue({ items: [{ code: "ESG-0001", period: "2025", status: "published", pillarScore: { environmental: 1, social: 1, governance: 1, overall: 1 }, highlights: [], generatedAt: "2026-01-01T00:00:00.000Z" }, { code: "ESG-0002", period: "2026", status: "draft", pillarScore: { environmental: 2, social: 2, governance: 2, overall: 2 }, highlights: [], generatedAt: "2026-02-01T00:00:00.000Z" }], total: 2 });
    await expect(new EsgService({ list } as unknown as DomainRecordRepository).listReports(user, meta)).resolves.toMatchObject([{ code: "ESG-0002" }, { code: "ESG-0001" }]);
  });
});
