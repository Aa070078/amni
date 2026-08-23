import { describe, expect, it, vi } from "vitest";

import type { DomainRecordRepository } from "../common/domain-record.repository";
import { EquityService } from "./equity.service";

const user = { id: "user-1", email: "owner@example.com", role: "owner" };
const meta = { requestId: "request-1" };

describe("EquityService", () => {
  it("persists a shareholder with searchable indexes", async () => {
    const list = vi.fn().mockResolvedValue({ items: [], total: 0 });
    const create = vi.fn(async (_user, _meta, _domain, _type, _code, record) => record);
    const service = new EquityService({ list, create } as unknown as DomainRecordRepository);
    const item = await service.createShareholder(user, meta, { name: "Amara", type: "founder", email: "amara@example.com", holdings: [{ classCode: "CLS-0001", shares: 250 }], investedAmount: 1000, joinedAt: "2026-08-01T00:00:00.000Z" });
    expect(item.totalShares).toBe(250);
    expect(create).toHaveBeenCalledWith(user, meta, "equity", "shareholder", item.code, item, expect.objectContaining({ title: "Amara", numericValue: 250 }));
  });

  it("derives a cap table from persisted shareholders and classes", async () => {
    const list = vi.fn(async (_user, _meta, _domain, type) => ({ items: type === "shareholder" ? [{ code: "SH-1", name: "Amara", type: "founder", totalShares: 100, holdings: [{ classCode: "CLS-1", shares: 100 }], investedAmount: 500, joinedAt: "2026-01-01T00:00:00.000Z", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }] : [{ code: "CLS-1", name: "Common", totalShares: 100, outstandingShares: 100, pricePerShare: 1, voting: true, status: "active", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }], total: 1 }));
    const service = new EquityService({ list } as unknown as DomainRecordRepository);
    await expect(service.capTable(user, meta)).resolves.toEqual([expect.objectContaining({ className: "Common", ownershipPct: 100 })]);
  });

  it("filters and paginates shareholders", async () => {
    const list = vi.fn().mockResolvedValue({ items: [
      { code: "SH-0001", name: "Founder", type: "founder", totalShares: 10, holdings: [], investedAmount: 0, joinedAt: "2026-01-01T00:00:00.000Z", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
      { code: "SH-0002", name: "Investor", type: "investor", totalShares: 20, holdings: [], investedAmount: 100, joinedAt: "2026-01-01T00:00:00.000Z", createdAt: "2026-01-02T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z" },
    ], total: 2 });
    const result = await new EquityService({ list } as unknown as DomainRecordRepository).listShareholders(user, meta, { page: 1, pageSize: 10, type: "investor" });
    expect(result.items.map((item) => item.code)).toEqual(["SH-0002"]);
    expect(result.meta.total).toBe(1);
  });

  it("reads shareholder detail from the repository", async () => {
    const get = vi.fn().mockResolvedValue({ code: "SH-0001", name: "Founder" });
    await expect(new EquityService({ get } as unknown as DomainRecordRepository).detailShareholder(user, meta, "SH-0001")).resolves.toMatchObject({ name: "Founder" });
  });

  it("updates shareholder holdings and total shares", async () => {
    const get = vi.fn().mockResolvedValue({ code: "SH-0001", name: "Founder", type: "founder", totalShares: 10, holdings: [], investedAmount: 0, joinedAt: "2026-01-01T00:00:00.000Z", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" });
    const update = vi.fn(async (_user, _meta, _domain, _type, _code, record) => record);
    const result = await new EquityService({ get, update } as unknown as DomainRecordRepository).updateShareholder(user, meta, "SH-0001", { holdings: [{ classCode: "CLS-0001", shares: 25 }] });
    expect(result.totalShares).toBe(25);
  });

  it("removes a shareholder through the repository", async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    await new EquityService({ remove } as unknown as DomainRecordRepository).removeShareholder(user, meta, "SH-0001");
    expect(remove).toHaveBeenCalledWith(user, meta, "equity", "shareholder", "SH-0001");
  });

  it("creates a share class with a collision-resistant contract code", async () => {
    const create = vi.fn(async (_user, _meta, _domain, _type, _code, record) => record);
    const item = await new EquityService({ create } as unknown as DomainRecordRepository).createClass(user, meta, { name: "Preferred", totalShares: 100, outstandingShares: 80, pricePerShare: 5 });
    expect(item.code).toMatch(/^CLS-[A-Z0-9]{10}$/);
    expect(item.status).toBe("active");
  });

  it("changes a share-class status durably", async () => {
    const get = vi.fn().mockResolvedValue({ code: "CLS-0001", name: "Common", totalShares: 100, outstandingShares: 100, pricePerShare: 1, voting: true, status: "active", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" });
    const update = vi.fn(async (_user, _meta, _domain, _type, _code, record) => record);
    await expect(new EquityService({ get, update } as unknown as DomainRecordRepository).changeClassStatus(user, meta, "CLS-0001", { status: "archived" })).resolves.toMatchObject({ status: "archived" });
  });

  it("filters funding rounds by status and search", async () => {
    const list = vi.fn().mockResolvedValue({ items: [{ code: "RD-0001", name: "Seed", type: "seed", announcedDate: "2026-01-01T00:00:00.000Z", amountRaised: 10, preMoney: 90, postMoney: 100, sharesIssued: 10, valuation: 100, investors: ["Fund"], status: "closed", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }], total: 1 });
    const result = await new EquityService({ list } as unknown as DomainRecordRepository).listRounds(user, meta, { page: 1, pageSize: 10, q: "fund", status: "closed" });
    expect(result.items).toHaveLength(1);
  });

  it("closes a round and supplies the close timestamp", async () => {
    const get = vi.fn().mockResolvedValue({ code: "RD-0001", name: "Seed", type: "seed", announcedDate: "2026-01-01T00:00:00.000Z", amountRaised: 10, preMoney: 90, postMoney: 100, sharesIssued: 10, valuation: 100, investors: [], status: "announced", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" });
    const update = vi.fn(async (_user, _meta, _domain, _type, _code, record) => record);
    const result = await new EquityService({ get, update } as unknown as DomainRecordRepository).changeRoundStatus(user, meta, "RD-0001", { status: "closed" });
    expect(result.closedDate).toBeTruthy();
  });

  it("derives overview totals from persisted records", async () => {
    const list = vi.fn(async (_user, _meta, _domain, type) => ({ items: type === "shareholder" ? [{ code: "SH-0001", name: "Fund", type: "investor", totalShares: 50, holdings: [], investedAmount: 500, joinedAt: "2026-01-01T00:00:00.000Z", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }] : type === "share_class" ? [] : [{ code: "RD-0001", name: "Seed", type: "seed", announcedDate: "2026-01-01T00:00:00.000Z", closedDate: "2026-01-02T00:00:00.000Z", amountRaised: 500, preMoney: 500, postMoney: 1000, sharesIssued: 50, valuation: 1000, investors: ["Fund"], status: "closed", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z" }], total: 1 }));
    await expect(new EquityService({ list } as unknown as DomainRecordRepository).overview(user, meta)).resolves.toMatchObject({ totalShares: 50, totalInvested: 500, currentValuation: 1000, investorCount: 1 });
  });
});
