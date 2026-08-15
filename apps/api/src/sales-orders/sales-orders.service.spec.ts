import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorCode } from "@amni/shared";
import { ErpError } from "@amni/erp";
import type * as ErpModule from "@amni/erp";

import { SalesOrdersService } from "./sales-orders.service";
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
  { name: "PRD-0001", item_name: "Alderwood standing desk", stock_uom: "pcs", standard_rate: 1450 },
  { name: "PRD-0002", item_name: "Aria ergonomic chair", stock_uom: "pcs", standard_rate: 620 },
];

const SALES_ORDER_DOCS = [
  { name: "SO-2040", customer: "CUS-0001", transaction_date: "2026-07-01 09:00:00", delivery_date: "2026-08-04 09:00:00", currency: "USD", grand_total: 5380, status: "Delivered", docstatus: 1, owner: "Amara Osei", notes: "First order", items: [{ item_code: "PRD-0001", item_name: "Alderwood standing desk", qty: 2, rate: 1450, amount: 2900, uom: "pcs" }, { item_code: "PRD-0002", item_name: "Aria ergonomic chair", qty: 4, rate: 620, amount: 2480, uom: "pcs" }], creation: "2026-06-30 09:00:00", modified: "2026-08-04 09:00:00" },
  { name: "SO-2041", customer: "CUS-0002", transaction_date: "2026-08-11 09:00:00", delivery_date: "2026-07-31 09:00:00", currency: "USD", grand_total: 3340, status: "To Deliver and Bill", docstatus: 1, owner: "Amara Osei", quotation: "QT-0011", notes: "Split delivery", items: [{ item_code: "PRD-0001", item_name: "Alderwood standing desk", qty: 2, rate: 1450, amount: 2900, uom: "pcs" }, { item_code: "PRD-0002", item_name: "Aria ergonomic chair", qty: 1, rate: 440, amount: 440, uom: "pcs" }], creation: "2026-08-11 09:00:00", modified: "2026-08-11 09:00:00" },
  { name: "SO-2043", customer: "CUS-0001", transaction_date: "2026-08-13 09:00:00", delivery_date: null, currency: "USD", grand_total: 8120, status: "Draft", docstatus: 0, owner: "Amara Osei", quotation: "QT-0001", notes: "Draft fit-out", items: [{ item_code: "PRD-0001", item_name: "Alderwood standing desk", qty: 4, rate: 1450, amount: 5800, uom: "pcs" }, { item_code: "PRD-0002", item_name: "Aria ergonomic chair", qty: 4, rate: 580, amount: 2320, uom: "pcs" }], creation: "2026-08-13 09:00:00", modified: "2026-08-13 09:00:00" },
  { name: "SO-2044", customer: "CUS-0002", transaction_date: "2026-06-15 09:00:00", delivery_date: "2026-07-15 09:00:00", currency: "USD", grand_total: 2890, status: "Completed", docstatus: 1, owner: "Theo Lindqvist", notes: "Closed", items: [{ item_code: "PRD-0001", item_name: "Alderwood standing desk", qty: 1, rate: 1450, amount: 1450, uom: "pcs" }, { item_code: "PRD-0002", item_name: "Aria ergonomic chair", qty: 3, rate: 480, amount: 1440, uom: "pcs" }], creation: "2026-06-14 09:00:00", modified: "2026-07-15 09:00:00" },
  { name: "SO-2047", customer: "CUS-0001", transaction_date: "2026-07-27 09:00:00", delivery_date: "2026-08-09 09:00:00", currency: "USD", grand_total: 3130, status: "Partially Delivered", docstatus: 1, owner: "Amara Osei", notes: "Back-order", items: [{ item_code: "PRD-0001", item_name: "Alderwood standing desk", qty: 1, rate: 1450, amount: 1450, uom: "pcs" }, { item_code: "PRD-0002", item_name: "Aria ergonomic chair", qty: 3, rate: 560, amount: 1680, uom: "pcs" }], creation: "2026-07-27 09:00:00", modified: "2026-08-11 09:00:00" },
  { name: "SO-2048", customer: "CUS-0002", transaction_date: "2026-07-15 09:00:00", delivery_date: "2026-08-04 09:00:00", currency: "USD", grand_total: 6810, status: "Cancelled", docstatus: 2, owner: "Theo Lindqvist", notes: "Cancelled by customer", items: [{ item_code: "PRD-0001", item_name: "Alderwood standing desk", qty: 3, rate: 1450, amount: 4350, uom: "pcs" }, { item_code: "PRD-0002", item_name: "Aria ergonomic chair", qty: 4, rate: 615, amount: 2460, uom: "pcs" }], creation: "2026-07-14 09:00:00", modified: "2026-07-26 09:00:00" },
];

describe("SalesOrdersService", () => {
  let service: SalesOrdersService;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createErpClientForTenant.mockResolvedValue(mocks.client);
    mocks.auditLog.create.mockResolvedValue({ id: "audit-1" });
    mocks.membership.findFirst.mockResolvedValue({ companyId: COMPANY });
    mocks.client.list.mockImplementation((doctype: string) => {
      if (doctype === "Customer") return Promise.resolve({ items: CUSTOMER_DOCS, hasMore: false });
      if (doctype === "Item") return Promise.resolve({ items: PRODUCT_DOCS, hasMore: false });
      return Promise.resolve({ items: SALES_ORDER_DOCS, hasMore: false });
    });
    mocks.client.get.mockImplementation((doctype: string, code: string) => {
      if (doctype === "Customer") {
        const customer = CUSTOMER_DOCS.find((entry) => entry.name === code);
        return customer ? Promise.resolve(customer) : Promise.reject(new ErpError(ErrorCode.ERP_NOT_FOUND, "Not Found", { status: 404 }));
      }
      const doc = SALES_ORDER_DOCS.find((entry) => entry.name === code);
      return doc ? Promise.resolve(doc) : Promise.reject(new ErpError(ErrorCode.ERP_NOT_FOUND, "Not Found", { status: 404 }));
    });
    service = new SalesOrdersService(new ErpGatewayService());
  });

  describe("options", () => {
    it("returns customers and products for the order builder", async () => {
      const options = await service.options(USER, META);

      expect(options.customers).toEqual([
        { code: "CUS-0001", name: "Serenity Interiors" },
        { code: "CUS-0002", name: "Lumina Supplies" },
      ]);
      expect(options.products).toEqual([
        { code: "PRD-0001", name: "Alderwood standing desk", uom: "pcs", rate: 1450 },
        { code: "PRD-0002", name: "Aria ergonomic chair", uom: "pcs", rate: 620 },
      ]);
    });
  });

  describe("list", () => {
    it("returns sales orders from the tenant site mapped to the contract", async () => {
      const result = await service.list(USER, META, { page: 1, pageSize: 20 });

      expect(result.meta.total).toBe(6);
      expect(result.items[0].code).toBe("SO-2043");
      expect(result.items[0].status).toBe("draft");
      expect(result.items[0].customer.name).toBe("Serenity Interiors");
    });

    it("maps ERPNext statuses onto the platform vocabulary", async () => {
      const result = await service.list(USER, META, { page: 1, pageSize: 20 });

      const byCode = new Map(result.items.map((order) => [order.code, order.status]));
      expect(byCode.get("SO-2040")).toBe("delivered");
      expect(byCode.get("SO-2041")).toBe("submitted");
      expect(byCode.get("SO-2044")).toBe("completed");
      expect(byCode.get("SO-2047")).toBe("partially_delivered");
      expect(byCode.get("SO-2048")).toBe("cancelled");
    });

    it("reads the quotation reference and delivery date", async () => {
      const result = await service.list(USER, META, { page: 1, pageSize: 20 });

      const byCode = new Map(result.items.map((order) => [order.code, order]));
      expect(byCode.get("SO-2041")?.quotationCode).toBe("QT-0011");
      expect(byCode.get("SO-2043")?.deliveryDate).toBeNull();
    });

    it("filters by status", async () => {
      const result = await service.list(USER, META, { page: 1, pageSize: 20, status: "submitted" });

      expect(result.meta.total).toBe(1);
      expect(result.items[0].code).toBe("SO-2041");
    });

    it("searches across customer name and notes", async () => {
      const result = await service.list(USER, META, { page: 1, pageSize: 20, q: "lumina" });

      expect(result.meta.total).toBe(3);
    });

    it("sorts by total descending when requested", async () => {
      const result = await service.list(USER, META, { page: 1, pageSize: 20, sortBy: "total", sortDir: "desc" });

      expect(result.items[0].code).toBe("SO-2043");
      expect(result.items[0].summary.total).toBe(8120);
    });

    it("paginates", async () => {
      const page1 = await service.list(USER, META, { page: 1, pageSize: 3 });
      const page2 = await service.list(USER, META, { page: 2, pageSize: 3 });

      expect(page1.items.length).toBe(3);
      expect(page2.items.length).toBe(3);
      expect(page2.items[0].code).not.toBe(page1.items[0].code);
    });
  });

  describe("detail", () => {
    it("returns the sales order with customer and computed summary", async () => {
      const order = await service.detail(USER, META, "SO-2041");

      expect(order.code).toBe("SO-2041");
      expect(order.status).toBe("submitted");
      expect(order.customer).toEqual({ code: "CUS-0002", name: "Lumina Supplies" });
      expect(order.quotationCode).toBe("QT-0011");
      expect(order.deliveryDate).not.toBeNull();
      expect(order.summary.total).toBe(3340);
    });

    it("throws not_found for an unknown sales order", async () => {
      await expect(service.detail(USER, META, "SO-9999")).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });
  });

  describe("create", () => {
    it("creates the Sales Order doc and audits", async () => {
      mocks.client.create.mockResolvedValue({
        name: "SO-2053",
        customer: "CUS-0001",
        transaction_date: "2026-08-14 09:00:00",
        docstatus: 0,
        items: [{ item_code: "PRD-0001", item_name: "Alderwood standing desk", qty: 2, rate: 1450, amount: 2900, uom: "pcs" }],
        creation: "2026-08-14 09:00:00",
        modified: "2026-08-14 09:00:00",
      });

      const order = await service.create(USER, META, {
        customerCode: "CUS-0001",
        items: [{ product: "PRD-0001", qty: 2, rate: 1450 }],
      });

      expect(mocks.client.create).toHaveBeenCalledWith(
        "Sales Order",
        expect.objectContaining({
          customer: "CUS-0001",
          currency: "USD",
          items: expect.arrayContaining([
            expect.objectContaining({ item_code: "PRD-0001", qty: 2, rate: 1450, uom: "pcs" }),
          ]),
        }),
      );
      expect(order.code).toBe("SO-2053");
      expect(order.status).toBe("draft");
      expect(order.customer.name).toBe("Serenity Interiors");
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "sales_order.create", resourceType: "Sales Order", resourceId: "SO-2053", companyId: COMPANY, actorId: USER.id }),
      });
    });
  });

  describe("update", () => {
    it("patches a draft sales order and audits", async () => {
      mocks.client.update.mockResolvedValue({ ...SALES_ORDER_DOCS[2], notes: "revised" });

      const order = await service.update(USER, META, "SO-2043", { notes: "revised" });

      expect(mocks.client.update).toHaveBeenCalledWith(
        "Sales Order",
        "SO-2043",
        expect.objectContaining({ notes: "revised" }),
      );
      expect(order.notes).toBe("revised");
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "sales_order.update", resourceId: "SO-2043" }),
      });
    });

    it("rejects updates to a submitted sales order", async () => {
      await expect(service.update(USER, META, "SO-2041", { notes: "revised" })).rejects.toMatchObject({
        code: ErrorCode.UNPROCESSABLE,
      });
    });

    it("throws not_found when the sales order does not exist", async () => {
      await expect(service.update(USER, META, "SO-9999", { notes: "revised" })).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });
  });

  describe("changeStatus", () => {
    it("submits a sales order and audits sales_order.submit", async () => {
      mocks.client.submit.mockResolvedValue({ ...SALES_ORDER_DOCS[1], status: "To Deliver and Bill" });

      const order = await service.changeStatus(USER, META, "SO-2043", "submitted");

      expect(mocks.client.submit).toHaveBeenCalledWith("Sales Order", "SO-2043");
      expect(order.status).toBe("submitted");
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "sales_order.submit", resourceId: "SO-2043" }),
      });
    });

    it("cancels a sales order and audits sales_order.cancel", async () => {
      mocks.client.cancel.mockResolvedValue(SALES_ORDER_DOCS[5]);

      const order = await service.changeStatus(USER, META, "SO-2048", "cancelled");

      expect(mocks.client.cancel).toHaveBeenCalledWith("Sales Order", "SO-2048");
      expect(order.status).toBe("cancelled");
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "sales_order.cancel", resourceId: "SO-2048" }),
      });
    });

    it("rejects unsupported status transitions", async () => {
      await expect(service.changeStatus(USER, META, "SO-2041", "delivered")).rejects.toMatchObject({
        code: ErrorCode.UNPROCESSABLE,
      });
    });
  });

  describe("remove", () => {
    it("deletes a draft sales order and audits", async () => {
      mocks.client.delete.mockResolvedValue(undefined);

      await service.remove(USER, META, "SO-2043");

      expect(mocks.client.delete).toHaveBeenCalledWith("Sales Order", "SO-2043");
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "sales_order.remove", resourceType: "Sales Order", resourceId: "SO-2043" }),
      });
    });

    it("rejects removal of a submitted sales order", async () => {
      await expect(service.remove(USER, META, "SO-2041")).rejects.toMatchObject({
        code: ErrorCode.UNPROCESSABLE,
      });
    });
  });
});
