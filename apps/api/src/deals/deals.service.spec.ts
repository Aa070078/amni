import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorCode } from "@amni/shared";
import { ErpError } from "@amni/erp";
import type * as ErpModule from "@amni/erp";

import { DealsService } from "./deals.service";
import { ErpGatewayService, type GatewayRequestMeta, type GatewayUser } from "../erp-gateway/erp-gateway.service";

const mocks = vi.hoisted(() => {
  const client = {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  return {
    membership: { findFirst: vi.fn() },
    auditLog: { create: vi.fn() },
    createErpClientForTenant: vi.fn(async () => client),
    client,
  };
});

vi.mock("@amni/db", () => ({
  prisma: { membership: mocks.membership, auditLog: mocks.auditLog },
}));

vi.mock("@amni/erp", async (importOriginal) => ({
  ...(await importOriginal<typeof ErpModule>()),
  createErpClientForTenant: mocks.createErpClientForTenant,
}));

const USER: GatewayUser = { id: "user-1", email: "owner@acme.com", role: "USER" };
const META: GatewayRequestMeta = { ip: "10.0.0.1", requestId: "req-1" };
const COMPANY = "company-1";

const DEAL_DOCS = [
  { name: "DL-0001", title: "Mission district office fit-out", customer_name: "Serenity Interiors", contact_display: "Maya Chen", contact_email: "maya@serenityinteriors.com", contact_mobile: "+1 415-555-0142", source: "referral", status: "Quotation", opportunity_amount: 48200, currency: "USD", expected_closing: "2026-09-04", opportunity_owner: "Amara Osei", notes: "Full office fit-out", creation: "2026-07-11 09:00:00", modified: "2026-08-12 09:00:00" },
  { name: "DL-0002", title: "LED rollout across retail locations", customer_name: "Lumina Supplies", contact_display: "Dario Beltran", contact_email: "dario@luminasupplies.com", contact_mobile: "+1 312-555-0198", source: "trade_show", status: "Replied", opportunity_amount: 23500, currency: "USD", expected_closing: "2026-09-28", opportunity_owner: "Amara Osei", notes: "", creation: "2026-07-17 09:00:00", modified: "2026-08-10 09:00:00" },
  { name: "DL-0003", title: "Warehouse shelving refresh", customer_name: "Atlas Facilities", contact_display: "Priya Raman", contact_email: "priya@atlasfacilities.co.uk", contact_mobile: "+44 20 7946 0132", source: "website", status: "Open", opportunity_amount: 12900, currency: "USD", expected_closing: "2026-10-07", opportunity_owner: "Amara Osei", notes: "", creation: "2026-08-08 09:00:00", modified: "2026-08-08 09:00:00" },
  { name: "DL-0004", title: "Pilot store rollout", customer_name: "Harbor & Sage", contact_display: "Grace Liu", contact_email: "grace@harborandsage.com", contact_mobile: "+1 206-555-0129", source: "social", status: "Converted", opportunity_amount: 27800, currency: "USD", expected_closing: "2026-07-31", opportunity_owner: "Amara Osei", notes: "Signed", creation: "2026-06-19 09:00:00", modified: "2026-07-31 09:00:00" },
];

describe("DealsService", () => {
  let service: DealsService;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createErpClientForTenant.mockResolvedValue(mocks.client);
    mocks.auditLog.create.mockResolvedValue({ id: "audit-1" });
    mocks.membership.findFirst.mockResolvedValue({ companyId: COMPANY });
    service = new DealsService(new ErpGatewayService());
  });

  describe("pipeline", () => {
    it("returns stats for every stage in canonical order, mapping ERPNext statuses back", async () => {
      mocks.client.list.mockResolvedValue({ items: DEAL_DOCS, hasMore: false });

      const result = await service.pipeline(USER, META, {});

      expect(result.stats.map((stat) => stat.stage)).toEqual([
        "qualification",
        "analysis",
        "proposal",
        "negotiation",
        "won",
        "lost",
      ]);
      expect(result.stats.reduce((sum, stat) => sum + stat.count, 0)).toBe(result.items.length);
      expect(result.items.map((deal) => deal.code)).toEqual(["DL-0001", "DL-0002", "DL-0003", "DL-0004"]);
      expect(result.items[0].stage).toBe("proposal");
    });

    it("filters the pipeline by search across title, company and contact", async () => {
      mocks.client.list.mockResolvedValue({ items: DEAL_DOCS, hasMore: false });

      const result = await service.pipeline(USER, META, { q: "shelving" });

      expect(result.items.length).toBe(1);
      expect(result.items[0].code).toBe("DL-0003");
      const qualification = result.stats.find((stat) => stat.stage === "qualification");
      expect(qualification?.count).toBe(1);
      expect(qualification?.value).toBe(12900);
    });
  });

  describe("list", () => {
    it("returns deals from the tenant site mapped to the contract, sorted by createdAt desc", async () => {
      mocks.client.list.mockResolvedValue({ items: DEAL_DOCS, hasMore: false });

      const result = await service.list(USER, META, { page: 1, pageSize: 20 });

      expect(result.meta.total).toBe(4);
      expect(result.items[0].code).toBe("DL-0003");
      expect(result.items[0].source).toBe("website");
      expect(result.items[0].currency).toBe("USD");
    });

    it("filters by stage", async () => {
      mocks.client.list.mockResolvedValue({ items: DEAL_DOCS, hasMore: false });

      const result = await service.list(USER, META, { page: 1, pageSize: 20, stage: "won" });

      expect(result.items.every((deal) => deal.stage === "won")).toBe(true);
      expect(result.meta.total).toBe(1);
      expect(result.items[0].code).toBe("DL-0004");
    });

    it("searches case-insensitively across title, company and contact", async () => {
      mocks.client.list.mockResolvedValue({ items: DEAL_DOCS, hasMore: false });

      const result = await service.list(USER, META, { page: 1, pageSize: 20, q: "MAYA" });

      expect(result.meta.total).toBe(1);
      expect(result.items[0].code).toBe("DL-0001");
    });

    it("sorts by value descending when requested", async () => {
      mocks.client.list.mockResolvedValue({ items: DEAL_DOCS, hasMore: false });

      const result = await service.list(USER, META, { page: 1, pageSize: 20, sortBy: "value", sortDir: "desc" });

      const [first, second] = result.items;
      expect(first.code).toBe("DL-0001");
      expect(first.value).toBeGreaterThanOrEqual(second.value);
    });

    it("paginates", async () => {
      mocks.client.list.mockResolvedValue({ items: DEAL_DOCS, hasMore: false });

      const page1 = await service.list(USER, META, { page: 1, pageSize: 2 });
      const page2 = await service.list(USER, META, { page: 2, pageSize: 2 });

      expect(page1.items.length).toBe(2);
      expect(page2.items.length).toBe(2);
      expect(page2.items[0].code).not.toBe(page1.items[0].code);
    });
  });

  describe("detail", () => {
    it("returns the deal with derived activities and stage probability", async () => {
      mocks.client.get.mockResolvedValue(DEAL_DOCS[3]);

      const detail = await service.detail(USER, META, "DL-0004");

      expect(detail.code).toBe("DL-0004");
      expect(detail.stage).toBe("won");
      expect(detail.probability).toBe(100);
      expect(detail.value).toBe(27800);
      expect(detail.expectedClose).toBe("2026-07-31");
      expect(detail.activities.some((activity) => activity.action === "Won deal")).toBe(true);
      expect(detail.activities.some((activity) => activity.action === "Sent proposal")).toBe(true);
      expect(mocks.client.get).toHaveBeenCalledWith("Opportunity", "DL-0004");
    });

    it("throws not_found for an unknown deal", async () => {
      mocks.client.get.mockRejectedValue(new ErpError(ErrorCode.ERP_NOT_FOUND, "Not Found", { status: 404 }));

      await expect(service.detail(USER, META, "DL-9999")).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });
  });

  describe("create", () => {
    it("creates the Opportunity doc with mapped stage, opportunity_amount and currency, then audits", async () => {
      mocks.client.create.mockResolvedValue({
        name: "DL-0021",
        title: "Test Co expansion",
        customer_name: "Test Co",
        contact_display: "Jane Doe",
        contact_email: "jane@testco.com",
        status: "Open",
        opportunity_amount: 10000,
        currency: "USD",
      });

      const deal = await service.create(USER, META, {
        title: "Test Co expansion",
        company: "Test Co",
        contactName: "Jane Doe",
        contactEmail: "jane@testco.com",
        value: 10000,
      });

      expect(mocks.client.create).toHaveBeenCalledWith(
        "Opportunity",
        expect.objectContaining({
          title: "Test Co expansion",
          customer_name: "Test Co",
          contact_display: "Jane Doe",
          contact_email: "jane@testco.com",
          status: "Open",
          opportunity_amount: 10000,
          currency: "USD",
        }),
      );
      expect(deal.code).toBe("DL-0021");
      expect(deal.stage).toBe("qualification");
      expect(deal.probability).toBe(15);
      expect(deal.currency).toBe("USD");
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "deal.create", resourceType: "Opportunity", resourceId: "DL-0021", companyId: COMPANY, actorId: USER.id }),
      });
    });
  });

  describe("update", () => {
    it("patches mapped fields and audits", async () => {
      mocks.client.update.mockResolvedValue({ ...DEAL_DOCS[2], opportunity_amount: 14000, opportunity_owner: "Theo Lindqvist" });

      const deal = await service.update(USER, META, "DL-0003", { value: 14000, owner: "Theo Lindqvist" });

      expect(mocks.client.update).toHaveBeenCalledWith(
        "Opportunity",
        "DL-0003",
        expect.objectContaining({ opportunity_amount: 14000, opportunity_owner: "Theo Lindqvist" }),
      );
      expect(deal.value).toBe(14000);
      expect(deal.owner).toBe("Theo Lindqvist");
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "deal.update", resourceId: "DL-0003" }),
      });
    });

    it("maps a stage change to the ERPNext status and recomputes probability", async () => {
      mocks.client.update.mockResolvedValue({ ...DEAL_DOCS[2], status: "Converted" });

      const deal = await service.update(USER, META, "DL-0003", { stage: "won" });

      expect(mocks.client.update).toHaveBeenCalledWith(
        "Opportunity",
        "DL-0003",
        expect.objectContaining({ status: "Converted" }),
      );
      expect(deal.stage).toBe("won");
      expect(deal.probability).toBe(100);
    });

    it("throws not_found when the deal does not exist", async () => {
      mocks.client.update.mockRejectedValue(new ErpError(ErrorCode.ERP_NOT_FOUND, "Not Found", { status: 404 }));

      await expect(service.update(USER, META, "DL-9999", { value: 1 })).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });
  });

  describe("moveStage", () => {
    it("updates only the status field and audits deal.moveStage", async () => {
      mocks.client.update.mockResolvedValue({ ...DEAL_DOCS[2], status: "Converted" });

      const deal = await service.moveStage(USER, META, "DL-0003", { stage: "won" });

      expect(mocks.client.update).toHaveBeenCalledWith("Opportunity", "DL-0003", { status: "Converted" });
      expect(deal.stage).toBe("won");
      expect(deal.probability).toBe(100);
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "deal.moveStage", resourceId: "DL-0003" }),
      });
    });

    it("throws not_found when the deal does not exist", async () => {
      mocks.client.update.mockRejectedValue(new ErpError(ErrorCode.ERP_NOT_FOUND, "Not Found", { status: 404 }));

      await expect(service.moveStage(USER, META, "DL-9999", { stage: "won" })).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });
  });

  describe("remove", () => {
    it("deletes the Opportunity doc and audits", async () => {
      mocks.client.delete.mockResolvedValue(undefined);

      await service.remove(USER, META, "DL-0010");

      expect(mocks.client.delete).toHaveBeenCalledWith("Opportunity", "DL-0010");
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "deal.delete", resourceType: "Opportunity", resourceId: "DL-0010" }),
      });
    });

    it("throws not_found for an unknown deal", async () => {
      mocks.client.delete.mockRejectedValue(new ErpError(ErrorCode.ERP_NOT_FOUND, "Not Found", { status: 404 }));

      await expect(service.remove(USER, META, "DL-9999")).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });
  });
});
