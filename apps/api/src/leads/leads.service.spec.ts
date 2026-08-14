import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorCode } from "@amni/shared";
import { ErpError } from "@amni/erp";
import type * as ErpModule from "@amni/erp";

import { LeadsService } from "./leads.service";
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

const LEAD_DOCS = [
  { name: "LD-0001", company_name: "Serenity Interiors", lead_name: "Maya Chen", email_id: "maya@serenityinteriors.com", phone: "+1 415-555-0142", source: "referral", status: "Opportunity", opportunity_amount: 48200, currency: "USD", expected_close_date: "2026-09-04", lead_owner: "Amara Osei", notes: "Full office fit-out", creation: "2026-07-11 09:00:00", modified: "2026-08-12 09:00:00" },
  { name: "LD-0002", company_name: "Lumina Supplies", lead_name: "Dario Beltran", email_id: "dario@luminasupplies.com", phone: "+1 312-555-0198", source: "trade_show", status: "Qualified", opportunity_amount: 23500, currency: "USD", expected_close_date: "2026-09-28", lead_owner: "Amara Osei", notes: "", creation: "2026-07-17 09:00:00", modified: "2026-08-10 09:00:00" },
  { name: "LD-0003", company_name: "Atlas Facilities", lead_name: "Priya Raman", email_id: "priya@atlasfacilities.co.uk", phone: "+44 20 7946 0132", source: "website", status: "Open", opportunity_amount: 12900, currency: "USD", expected_close_date: "2026-10-07", lead_owner: "Amara Osei", notes: "", creation: "2026-08-08 09:00:00", modified: "2026-08-08 09:00:00" },
  { name: "LD-0006", company_name: "Harbor & Sage", lead_name: "Grace Liu", email_id: "grace@harborandsage.com", phone: "+1 206-555-0129", source: "social", status: "Converted", opportunity_amount: 27800, currency: "USD", expected_close_date: "2026-07-31", lead_owner: "Amara Osei", notes: "Signed", creation: "2026-06-19 09:00:00", modified: "2026-07-31 09:00:00" },
];

describe("LeadsService", () => {
  let service: LeadsService;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createErpClientForTenant.mockResolvedValue(mocks.client);
    mocks.auditLog.create.mockResolvedValue({ id: "audit-1" });
    mocks.membership.findFirst.mockResolvedValue({ companyId: COMPANY });
    service = new LeadsService(new ErpGatewayService());
  });

  describe("pipeline", () => {
    it("returns stats for every stage in canonical order, mapping ERPNext statuses back", async () => {
      mocks.client.list.mockResolvedValue({ items: LEAD_DOCS, hasMore: false });

      const result = await service.pipeline(USER, META, {});

      expect(result.stats.map((stat) => stat.stage)).toEqual([
        "new",
        "contacted",
        "qualified",
        "proposal",
        "won",
        "lost",
      ]);
      expect(result.stats.reduce((sum, stat) => sum + stat.count, 0)).toBe(result.items.length);
      expect(result.items.map((lead) => lead.code)).toEqual(["LD-0001", "LD-0002", "LD-0003", "LD-0006"]);
      expect(result.items[0].stage).toBe("proposal");
    });

    it("filters the pipeline by search across company and contact", async () => {
      mocks.client.list.mockResolvedValue({ items: LEAD_DOCS, hasMore: false });

      const result = await service.pipeline(USER, META, { q: "serenity" });

      expect(result.items.length).toBe(1);
      expect(result.items[0].code).toBe("LD-0001");
      const proposal = result.stats.find((stat) => stat.stage === "proposal");
      expect(proposal?.count).toBe(1);
      expect(proposal?.value).toBe(48200);
    });
  });

  describe("list", () => {
    it("returns leads from the tenant site mapped to the contract, sorted by createdAt desc", async () => {
      mocks.client.list.mockResolvedValue({ items: LEAD_DOCS, hasMore: false });

      const result = await service.list(USER, META, { page: 1, pageSize: 20 });

      expect(result.meta.total).toBe(4);
      expect(result.items[0].code).toBe("LD-0003");
      expect(result.items[0].source).toBe("website");
      expect(result.items[0].currency).toBe("USD");
    });

    it("filters by stage", async () => {
      mocks.client.list.mockResolvedValue({ items: LEAD_DOCS, hasMore: false });

      const result = await service.list(USER, META, { page: 1, pageSize: 20, stage: "won" });

      expect(result.items.every((lead) => lead.stage === "won")).toBe(true);
      expect(result.meta.total).toBe(1);
      expect(result.items[0].code).toBe("LD-0006");
    });

    it("searches case-insensitively across company and contact", async () => {
      mocks.client.list.mockResolvedValue({ items: LEAD_DOCS, hasMore: false });

      const result = await service.list(USER, META, { page: 1, pageSize: 20, q: "MAYA" });

      expect(result.meta.total).toBe(1);
      expect(result.items[0].code).toBe("LD-0001");
    });

    it("sorts by value descending when requested", async () => {
      mocks.client.list.mockResolvedValue({ items: LEAD_DOCS, hasMore: false });

      const result = await service.list(USER, META, { page: 1, pageSize: 20, sortBy: "value", sortDir: "desc" });

      const [first, second] = result.items;
      expect(first.code).toBe("LD-0001");
      expect(first.value).toBeGreaterThanOrEqual(second.value);
    });

    it("paginates", async () => {
      mocks.client.list.mockResolvedValue({ items: LEAD_DOCS, hasMore: false });

      const page1 = await service.list(USER, META, { page: 1, pageSize: 2 });
      const page2 = await service.list(USER, META, { page: 2, pageSize: 2 });

      expect(page1.items.length).toBe(2);
      expect(page2.items.length).toBe(2);
      expect(page2.items[0].code).not.toBe(page1.items[0].code);
    });
  });

  describe("detail", () => {
    it("returns the lead with derived activities and stage probability", async () => {
      mocks.client.get.mockResolvedValue(LEAD_DOCS[3]);

      const detail = await service.detail(USER, META, "LD-0006");

      expect(detail.code).toBe("LD-0006");
      expect(detail.stage).toBe("won");
      expect(detail.probability).toBe(100);
      expect(detail.value).toBe(27800);
      expect(detail.expectedClose).toBe("2026-07-31");
      expect(detail.activities.some((activity) => activity.action === "Won deal")).toBe(true);
      expect(detail.activities.some((activity) => activity.action === "Sent proposal")).toBe(true);
      expect(mocks.client.get).toHaveBeenCalledWith("Lead", "LD-0006");
    });

    it("throws not_found for an unknown lead", async () => {
      mocks.client.get.mockRejectedValue(new ErpError(ErrorCode.ERP_NOT_FOUND, "Not Found", { status: 404 }));

      await expect(service.detail(USER, META, "LD-9999")).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });
  });

  describe("create", () => {
    it("creates the Lead doc with mapped stage, opportunity_amount and currency, then audits", async () => {
      mocks.client.create.mockResolvedValue({
        name: "LD-0021",
        company_name: "Test Co",
        lead_name: "Jane Doe",
        email_id: "jane@testco.com",
        status: "Open",
        opportunity_amount: 10000,
        currency: "USD",
      });

      const lead = await service.create(USER, META, {
        company: "Test Co",
        contactName: "Jane Doe",
        contactEmail: "jane@testco.com",
        value: 10000,
      });

      expect(mocks.client.create).toHaveBeenCalledWith(
        "Lead",
        expect.objectContaining({
          company_name: "Test Co",
          lead_name: "Jane Doe",
          email_id: "jane@testco.com",
          status: "Open",
          opportunity_amount: 10000,
          currency: "USD",
        }),
      );
      expect(lead.code).toBe("LD-0021");
      expect(lead.stage).toBe("new");
      expect(lead.probability).toBe(10);
      expect(lead.currency).toBe("USD");
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "lead.create", resourceType: "Lead", resourceId: "LD-0021", companyId: COMPANY, actorId: USER.id }),
      });
    });
  });

  describe("update", () => {
    it("patches mapped fields and audits", async () => {
      mocks.client.update.mockResolvedValue({ ...LEAD_DOCS[2], opportunity_amount: 14000, lead_owner: "Theo Lindqvist" });

      const lead = await service.update(USER, META, "LD-0003", { value: 14000, owner: "Theo Lindqvist" });

      expect(mocks.client.update).toHaveBeenCalledWith(
        "Lead",
        "LD-0003",
        expect.objectContaining({ opportunity_amount: 14000, lead_owner: "Theo Lindqvist" }),
      );
      expect(lead.value).toBe(14000);
      expect(lead.owner).toBe("Theo Lindqvist");
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "lead.update", resourceId: "LD-0003" }),
      });
    });

    it("maps a stage change to the ERPNext status and recomputes probability", async () => {
      mocks.client.update.mockResolvedValue({ ...LEAD_DOCS[2], status: "Converted" });

      const lead = await service.update(USER, META, "LD-0003", { stage: "won" });

      expect(mocks.client.update).toHaveBeenCalledWith(
        "Lead",
        "LD-0003",
        expect.objectContaining({ status: "Converted" }),
      );
      expect(lead.stage).toBe("won");
      expect(lead.probability).toBe(100);
    });

    it("throws not_found when the lead does not exist", async () => {
      mocks.client.update.mockRejectedValue(new ErpError(ErrorCode.ERP_NOT_FOUND, "Not Found", { status: 404 }));

      await expect(service.update(USER, META, "LD-9999", { value: 1 })).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });
  });

  describe("moveStage", () => {
    it("updates only the status field and audits lead.moveStage", async () => {
      mocks.client.update.mockResolvedValue({ ...LEAD_DOCS[2], status: "Converted" });

      const lead = await service.moveStage(USER, META, "LD-0003", { stage: "won" });

      expect(mocks.client.update).toHaveBeenCalledWith("Lead", "LD-0003", { status: "Converted" });
      expect(lead.stage).toBe("won");
      expect(lead.probability).toBe(100);
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "lead.moveStage", resourceId: "LD-0003" }),
      });
    });

    it("throws not_found when the lead does not exist", async () => {
      mocks.client.update.mockRejectedValue(new ErpError(ErrorCode.ERP_NOT_FOUND, "Not Found", { status: 404 }));

      await expect(service.moveStage(USER, META, "LD-9999", { stage: "won" })).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });
  });

  describe("remove", () => {
    it("deletes the Lead doc and audits", async () => {
      mocks.client.delete.mockResolvedValue(undefined);

      await service.remove(USER, META, "LD-0010");

      expect(mocks.client.delete).toHaveBeenCalledWith("Lead", "LD-0010");
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "lead.delete", resourceType: "Lead", resourceId: "LD-0010" }),
      });
    });

    it("throws not_found for an unknown lead", async () => {
      mocks.client.delete.mockRejectedValue(new ErpError(ErrorCode.ERP_NOT_FOUND, "Not Found", { status: 404 }));

      await expect(service.remove(USER, META, "LD-9999")).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });
  });
});
