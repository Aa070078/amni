import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorCode } from "@amni/shared";
import { ErpError } from "@amni/erp";
import type * as ErpModule from "@amni/erp";

import { QuotationsService } from "./quotations.service";
import { ErpGatewayService, type GatewayRequestMeta, type GatewayUser } from "../erp-gateway/erp-gateway.service";

const mocks = vi.hoisted(() => {
  const client = {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    submit: vi.fn(),
    cancel: vi.fn(),
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

const CUSTOMER_DOCS = [
  { name: "CUS-0001", customer_name: "Serenity Interiors" },
  { name: "CUS-0002", customer_name: "Lumina Supplies" },
];

const PRODUCT_DOCS = [
  { name: "PRD-0001", item_name: "Ergo Task Chair", stock_uom: "pcs", standard_rate: 340 },
  { name: "PRD-0002", item_name: "Standing Desk Pro", stock_uom: "pcs", standard_rate: 720 },
];

const QUOTATION_DOCS = [
  { name: "QT-0001", customer: "CUS-0001", transaction_date: "2026-08-11 09:00:00", valid_till: "2026-09-10 09:00:00", currency: "USD", grand_total: 18000, status: "Sent", docstatus: 1, owner: "Amara Osei", notes: "Volume discount applied", items: [{ item_code: "PRD-0002", item_name: "Standing Desk Pro", qty: 12, rate: 720, amount: 8640, uom: "pcs" }, { item_code: "PRD-0001", item_name: "Ergo Task Chair", qty: 24, rate: 340, amount: 8160, uom: "pcs" }], creation: "2026-07-11 09:00:00", modified: "2026-08-12 09:00:00" },
  { name: "QT-0002", customer: "CUS-0002", transaction_date: "2026-08-13 09:00:00", valid_till: null, currency: "USD", grand_total: 4640, status: "Draft", docstatus: 0, owner: "Amara Osei", notes: "", items: [{ item_code: "PRD-0001", item_name: "Ergo Task Chair", qty: 8, rate: 340, amount: 2720, uom: "pcs" }, { item_code: "PRD-0002", item_name: "Standing Desk Pro", qty: 3, rate: 640, amount: 1920, uom: "pcs" }], creation: "2026-08-08 09:00:00", modified: "2026-08-13 09:00:00" },
  { name: "QT-0003", customer: "CUS-0001", transaction_date: "2026-07-25 09:00:00", valid_till: "2026-08-25 09:00:00", currency: "USD", grand_total: 10000, status: "Ordered", docstatus: 1, owner: "Theo Lindqvist", notes: "", items: [{ item_code: "PRD-0001", item_name: "Ergo Task Chair", qty: 20, rate: 500, amount: 10000, uom: "pcs" }], creation: "2026-06-19 09:00:00", modified: "2026-07-25 09:00:00" },
  { name: "QT-0004", customer: "CUS-0002", transaction_date: "2026-06-20 09:00:00", valid_till: "2026-07-20 09:00:00", currency: "USD", grand_total: 10400, status: "Expired", docstatus: 1, owner: "Theo Lindqvist", notes: "Lapsed", items: [{ item_code: "PRD-0002", item_name: "Standing Desk Pro", qty: 8, rate: 1300, amount: 10400, uom: "pcs" }], creation: "2026-06-01 09:00:00", modified: "2026-07-20 09:00:00" },
  { name: "QT-0006", customer: "CUS-0001", transaction_date: "2026-08-06 09:00:00", valid_till: null, currency: "USD", grand_total: 6120, status: "Cancelled", docstatus: 2, owner: "Amara Osei", notes: "Went with a lower bid", items: [{ item_code: "PRD-0001", item_name: "Ergo Task Chair", qty: 18, rate: 340, amount: 6120, uom: "pcs" }], creation: "2026-05-01 09:00:00", modified: "2026-08-06 09:00:00" },
];

describe("QuotationsService", () => {
  let service: QuotationsService;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createErpClientForTenant.mockResolvedValue(mocks.client);
    mocks.auditLog.create.mockResolvedValue({ id: "audit-1" });
    mocks.membership.findFirst.mockResolvedValue({ companyId: COMPANY });
    mocks.client.list.mockImplementation((doctype: string) => {
      if (doctype === "Customer") return Promise.resolve({ items: CUSTOMER_DOCS, hasMore: false });
      if (doctype === "Item") return Promise.resolve({ items: PRODUCT_DOCS, hasMore: false });
      return Promise.resolve({ items: QUOTATION_DOCS, hasMore: false });
    });
    mocks.client.get.mockImplementation((doctype: string, code: string) => {
      if (doctype === "Customer") {
        const customer = CUSTOMER_DOCS.find((entry) => entry.name === code);
        return customer ? Promise.resolve(customer) : Promise.reject(new ErpError(ErrorCode.ERP_NOT_FOUND, "Not Found", { status: 404 }));
      }
      const doc = QUOTATION_DOCS.find((entry) => entry.name === code);
      return doc ? Promise.resolve(doc) : Promise.reject(new ErpError(ErrorCode.ERP_NOT_FOUND, "Not Found", { status: 404 }));
    });
    service = new QuotationsService(new ErpGatewayService());
  });

  describe("options", () => {
    it("returns customers and products for the quote builder", async () => {
      const options = await service.options(USER, META);

      expect(options.customers).toEqual([
        { code: "CUS-0001", name: "Serenity Interiors" },
        { code: "CUS-0002", name: "Lumina Supplies" },
      ]);
      expect(options.products).toEqual([
        { code: "PRD-0001", name: "Ergo Task Chair", uom: "pcs", rate: 340 },
        { code: "PRD-0002", name: "Standing Desk Pro", uom: "pcs", rate: 720 },
      ]);
    });
  });

  describe("list", () => {
    it("returns quotations from the tenant site mapped to the contract", async () => {
      const result = await service.list(USER, META, { page: 1, pageSize: 20 });

      expect(result.meta.total).toBe(5);
      expect(result.items[0].code).toBe("QT-0002");
      expect(result.items[0].status).toBe("draft");
      expect(result.items[0].customer.name).toBe("Lumina Supplies");
      expect(result.items[1].status).toBe("sent");
    });

    it("maps ERPNext statuses onto the platform vocabulary", async () => {
      const result = await service.list(USER, META, { page: 1, pageSize: 20 });

      const byCode = new Map(result.items.map((quotation) => [quotation.code, quotation.status]));
      expect(byCode.get("QT-0003")).toBe("converted");
      expect(byCode.get("QT-0004")).toBe("expired");
      expect(byCode.get("QT-0006")).toBe("rejected");
    });

    it("filters by status", async () => {
      const result = await service.list(USER, META, { page: 1, pageSize: 20, status: "converted" });

      expect(result.meta.total).toBe(1);
      expect(result.items[0].code).toBe("QT-0003");
    });

    it("searches across customer name and item names", async () => {
      const result = await service.list(USER, META, { page: 1, pageSize: 20, q: "standing desk" });

      expect(result.meta.total).toBe(3);
    });

    it("sorts by total descending when requested", async () => {
      const result = await service.list(USER, META, { page: 1, pageSize: 20, sortBy: "total", sortDir: "desc" });

      expect(result.items[0].code).toBe("QT-0001");
      expect(result.items[0].summary.total).toBe(18000);
    });

    it("paginates", async () => {
      const page1 = await service.list(USER, META, { page: 1, pageSize: 2 });
      const page2 = await service.list(USER, META, { page: 2, pageSize: 2 });

      expect(page1.items.length).toBe(2);
      expect(page2.items.length).toBe(2);
      expect(page2.items[0].code).not.toBe(page1.items[0].code);
    });
  });

  describe("detail", () => {
    it("returns the quotation with customer and computed summary", async () => {
      const quotation = await service.detail(USER, META, "QT-0001");

      expect(quotation.code).toBe("QT-0001");
      expect(quotation.status).toBe("sent");
      expect(quotation.customer).toEqual({ code: "CUS-0001", name: "Serenity Interiors" });
      expect(quotation.items[0].product).toBe("PRD-0002");
      expect(quotation.summary.total).toBe(18000);
      expect(quotation.summary.tax).toBe(1200);
    });

    it("throws not_found for an unknown quotation", async () => {
      await expect(service.detail(USER, META, "QT-9999")).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });
  });

  describe("create", () => {
    it("creates the Quotation doc and audits", async () => {
      mocks.client.create.mockResolvedValue({
        name: "QT-0013",
        customer: "CUS-0001",
        transaction_date: "2026-08-14 09:00:00",
        docstatus: 0,
        items: [{ item_code: "PRD-0001", item_name: "Ergo Task Chair", qty: 2, rate: 340, amount: 680, uom: "pcs" }],
        creation: "2026-08-14 09:00:00",
        modified: "2026-08-14 09:00:00",
      });

      const quotation = await service.create(USER, META, {
        customerCode: "CUS-0001",
        items: [{ product: "PRD-0001", qty: 2, rate: 340 }],
      });

      expect(mocks.client.create).toHaveBeenCalledWith(
        "Quotation",
        expect.objectContaining({
          customer: "CUS-0001",
          currency: "USD",
          items: expect.arrayContaining([
            expect.objectContaining({ item_code: "PRD-0001", qty: 2, rate: 340, uom: "pcs" }),
          ]),
        }),
      );
      expect(quotation.code).toBe("QT-0013");
      expect(quotation.status).toBe("draft");
      expect(quotation.customer.name).toBe("Serenity Interiors");
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "quotation.create", resourceType: "Quotation", resourceId: "QT-0013", companyId: COMPANY, actorId: USER.id }),
      });
    });
  });

  describe("update", () => {
    it("patches a draft quotation and audits", async () => {
      mocks.client.update.mockResolvedValue({ ...QUOTATION_DOCS[1], notes: "revised" });

      const quotation = await service.update(USER, META, "QT-0002", { notes: "revised" });

      expect(mocks.client.update).toHaveBeenCalledWith(
        "Quotation",
        "QT-0002",
        expect.objectContaining({ notes: "revised" }),
      );
      expect(quotation.notes).toBe("revised");
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "quotation.update", resourceId: "QT-0002" }),
      });
    });

    it("rejects updates to a submitted quotation", async () => {
      await expect(service.update(USER, META, "QT-0001", { notes: "revised" })).rejects.toMatchObject({
        code: ErrorCode.UNPROCESSABLE,
      });
    });

    it("throws not_found when the quotation does not exist", async () => {
      await expect(service.update(USER, META, "QT-9999", { notes: "revised" })).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });
  });

  describe("changeStatus", () => {
    it("submits a quotation and audits quotation.submit", async () => {
      mocks.client.submit.mockResolvedValue(QUOTATION_DOCS[0]);

      const quotation = await service.changeStatus(USER, META, "QT-0001", "sent");

      expect(mocks.client.submit).toHaveBeenCalledWith("Quotation", "QT-0001");
      expect(quotation.status).toBe("sent");
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "quotation.submit", resourceId: "QT-0001" }),
      });
    });

    it("cancels a quotation and audits quotation.cancel", async () => {
      mocks.client.cancel.mockResolvedValue(QUOTATION_DOCS[4]);

      const quotation = await service.changeStatus(USER, META, "QT-0006", "rejected");

      expect(mocks.client.cancel).toHaveBeenCalledWith("Quotation", "QT-0006");
      expect(quotation.status).toBe("rejected");
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "quotation.cancel", resourceId: "QT-0006" }),
      });
    });

    it("rejects unsupported status transitions", async () => {
      await expect(service.changeStatus(USER, META, "QT-0001", "accepted")).rejects.toMatchObject({
        code: ErrorCode.UNPROCESSABLE,
      });
    });
  });

  describe("remove", () => {
    it("deletes a draft quotation and audits", async () => {
      mocks.client.delete.mockResolvedValue(undefined);

      await service.remove(USER, META, "QT-0002");

      expect(mocks.client.delete).toHaveBeenCalledWith("Quotation", "QT-0002");
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "quotation.remove", resourceType: "Quotation", resourceId: "QT-0002" }),
      });
    });

    it("rejects removal of a submitted quotation", async () => {
      await expect(service.remove(USER, META, "QT-0001")).rejects.toMatchObject({
        code: ErrorCode.UNPROCESSABLE,
      });
    });
  });
});
