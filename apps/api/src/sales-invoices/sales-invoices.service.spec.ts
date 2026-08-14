import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorCode } from "@amni/shared";
import { ErpError } from "@amni/erp";
import type * as ErpModule from "@amni/erp";

import { SalesInvoicesService } from "./sales-invoices.service";
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
  { name: "CUS-0003", customer_name: "Atlas Facilities" },
  { name: "CUS-0004", customer_name: "Northwind Traders" },
  { name: "CUS-0006", customer_name: "Harbor & Sage" },
];

const PRODUCT_DOCS = [
  { name: "PRD-0001", item_name: "Alderwood standing desk", stock_uom: "pcs", standard_rate: 1450 },
  { name: "PRD-0002", item_name: "Aria ergonomic chair", stock_uom: "pcs", standard_rate: 620 },
];

const line = (item_code: string, item_name: string, qty: number, rate: number, amount: number) => ({
  item_code,
  item_name,
  qty,
  rate,
  amount,
  uom: "pcs",
});

const INVOICE_DOCS = [
  { name: "INV-0001", customer: "CUS-0006", posting_date: "2026-06-27 09:00:00", due_date: "2026-07-27 09:00:00", currency: "USD", grand_total: 5380, outstanding_amount: 0, sales_order: "SO-2040", status: "Paid", docstatus: 1, owner: "Amara Osei", notes: "First order", items: [line("PRD-0001", "Alderwood standing desk", 2, 1450, 2900), line("PRD-0002", "Aria ergonomic chair", 4, 620, 2480)], creation: "2026-06-25 09:00:00", modified: "2026-07-27 09:00:00" },
  { name: "INV-0002", customer: "CUS-0004", posting_date: "2026-05-31 09:00:00", due_date: "2026-07-30 09:00:00", currency: "USD", grand_total: 2890, outstanding_amount: 2890, status: "Overdue", docstatus: 1, owner: "Theo Lindqvist", notes: "Follow up on outstanding balance", items: [line("PRD-0004", "Linea lateral file cabinet", 6, 340, 2040), line("PRD-0003", "Lumen task lamp", 10, 85, 850)], creation: "2026-05-29 09:00:00", modified: "2026-07-30 09:00:00" },
  { name: "INV-0003", customer: "CUS-0001", posting_date: "2026-07-15 09:00:00", due_date: "2026-09-13 09:00:00", currency: "USD", grand_total: 6810, outstanding_amount: 1810, sales_order: "SO-2038", status: "Partly Paid", docstatus: 1, owner: "Amara Osei", notes: "Deposit received", items: [line("PRD-0001", "Alderwood standing desk", 4, 1450, 5800), line("PRD-0007", "Acoustic partition panel", 1, 410, 410), line("PRD-0008", "Flux dual monitor arm", 4, 150, 600)], creation: "2026-07-13 09:00:00", modified: "2026-08-01 09:00:00" },
  { name: "INV-0005", customer: "CUS-0003", posting_date: "2026-08-06 09:00:00", due_date: "2026-09-05 09:00:00", currency: "USD", grand_total: 3340, outstanding_amount: 3340, sales_order: "SO-2041", status: "Unpaid", docstatus: 1, owner: "Amara Osei", notes: "Submitted with 14-day payment terms", items: [line("PRD-0001", "Alderwood standing desk", 2, 1450, 2900), line("PRD-0002", "Aria ergonomic chair", 1, 440, 440)], creation: "2026-08-04 09:00:00", modified: "2026-08-06 09:00:00" },
  { name: "INV-0008", customer: "CUS-0002", posting_date: "2026-06-24 09:00:00", due_date: "2026-08-09 09:00:00", currency: "USD", grand_total: 3340, outstanding_amount: 2340, status: "Partly Paid", docstatus: 1, owner: "Theo Lindqvist", notes: "Part payment posted; remainder past due", items: [line("PRD-0004", "Linea lateral file cabinet", 8, 340, 2720), line("PRD-0003", "Lumen task lamp", 8, 85, 680)], creation: "2026-06-22 09:00:00", modified: "2026-08-09 09:00:00" },
  { name: "INV-0009", customer: "CUS-0001", posting_date: "2026-08-12 09:00:00", due_date: "2026-09-11 09:00:00", currency: "USD", grand_total: 4920, outstanding_amount: 4920, status: "Draft", docstatus: 0, owner: "Amara Osei", notes: "Awaiting final pricing approval", items: [line("PRD-0002", "Aria ergonomic chair", 6, 620, 3720), line("PRD-0008", "Flux dual monitor arm", 8, 150, 1200)], creation: "2026-08-12 09:00:00", modified: "2026-08-12 09:00:00" },
  { name: "INV-0011", customer: "CUS-0002", posting_date: "2026-07-10 09:00:00", due_date: "2026-08-10 09:00:00", currency: "USD", grand_total: 1450, outstanding_amount: 1450, status: "Cancelled", docstatus: 2, owner: "Theo Lindqvist", notes: "Cancelled by customer", items: [line("PRD-0001", "Alderwood standing desk", 1, 1450, 1450)], creation: "2026-07-08 09:00:00", modified: "2026-07-25 09:00:00" },
];

describe("SalesInvoicesService", () => {
  let service: SalesInvoicesService;
  let inv0005Doc = INVOICE_DOCS[3];

  beforeEach(() => {
    vi.clearAllMocks();
    inv0005Doc = INVOICE_DOCS[3];
    mocks.createErpClientForTenant.mockResolvedValue(mocks.client);
    mocks.auditLog.create.mockResolvedValue({ id: "audit-1" });
    mocks.membership.findFirst.mockResolvedValue({ companyId: COMPANY });
    mocks.client.list.mockImplementation((doctype: string) => {
      if (doctype === "Customer") return Promise.resolve({ items: CUSTOMER_DOCS, hasMore: false });
      if (doctype === "Item") return Promise.resolve({ items: PRODUCT_DOCS, hasMore: false });
      return Promise.resolve({ items: INVOICE_DOCS, hasMore: false });
    });
    mocks.client.get.mockImplementation((doctype: string, code: string) => {
      if (doctype === "Customer") {
        const customer = CUSTOMER_DOCS.find((entry) => entry.name === code);
        return customer ? Promise.resolve(customer) : Promise.reject(new ErpError(ErrorCode.ERP_NOT_FOUND, "Not Found", { status: 404 }));
      }
      if (doctype === "Sales Invoice" && code === "INV-0005") return Promise.resolve(inv0005Doc);
      const doc = INVOICE_DOCS.find((entry) => entry.name === code);
      return doc ? Promise.resolve(doc) : Promise.reject(new ErpError(ErrorCode.ERP_NOT_FOUND, "Not Found", { status: 404 }));
    });
    service = new SalesInvoicesService(new ErpGatewayService());
  });

  describe("summary", () => {
    it("computes outstanding, month billed, overdue and count from submitted invoices", async () => {
      const summary = await service.summary(USER, META);

      expect(summary.outstanding).toBe(10380);
      expect(summary.overdue).toBe(5230);
      expect(summary.monthBilled).toBe(8260);
      expect(summary.count).toBe(6);
      expect(summary.currency).toBe("USD");
    });
  });

  describe("options", () => {
    it("returns customers and products for the invoice builder", async () => {
      const options = await service.options(USER, META);

      expect(options.customers[0]).toEqual({ code: "CUS-0001", name: "Serenity Interiors" });
      expect(options.products[0]).toEqual({ code: "PRD-0001", name: "Alderwood standing desk", uom: "pcs", rate: 1450 });
    });
  });

  describe("list", () => {
    it("returns invoices sorted by createdAt desc by default", async () => {
      const result = await service.list(USER, META, { page: 1, pageSize: 20 });

      expect(result.meta.total).toBe(7);
      expect(result.items[0].code).toBe("INV-0009");
    });

    it("maps ERPNext docs to payment statuses using outstanding amount and due date", async () => {
      const result = await service.list(USER, META, { page: 1, pageSize: 20 });

      const byCode = new Map(result.items.map((invoice) => [invoice.code, invoice]));
      expect(byCode.get("INV-0001")?.status).toBe("paid");
      expect(byCode.get("INV-0002")?.status).toBe("overdue");
      expect(byCode.get("INV-0003")?.status).toBe("partially_paid");
      expect(byCode.get("INV-0005")?.status).toBe("submitted");
      expect(byCode.get("INV-0008")?.status).toBe("overdue");
      expect(byCode.get("INV-0009")?.status).toBe("draft");
      expect(byCode.get("INV-0011")?.status).toBe("cancelled");
    });

    it("computes amountPaid and reads order/due references", async () => {
      const result = await service.list(USER, META, { page: 1, pageSize: 20 });

      const byCode = new Map(result.items.map((invoice) => [invoice.code, invoice]));
      expect(byCode.get("INV-0001")?.amountPaid).toBe(5380);
      expect(byCode.get("INV-0003")?.amountPaid).toBe(5000);
      expect(byCode.get("INV-0001")?.salesOrderCode).toBe("SO-2040");
      expect(byCode.get("INV-0001")?.dueDate).not.toBeNull();
    });

    it("filters by status", async () => {
      const result = await service.list(USER, META, { page: 1, pageSize: 20, status: "overdue" });

      expect(result.meta.total).toBe(2);
    });

    it("searches across customer name and code", async () => {
      const result = await service.list(USER, META, { page: 1, pageSize: 20, q: "harbor" });

      expect(result.meta.total).toBe(1);
      expect(result.items[0].customer.code).toBe("CUS-0006");
    });

    it("sorts by total descending when requested", async () => {
      const result = await service.list(USER, META, { page: 1, pageSize: 20, sortBy: "total", sortDir: "desc" });

      expect(result.items[0].code).toBe("INV-0003");
      expect(result.items[0].summary.total).toBe(6810);
    });

    it("paginates", async () => {
      const page1 = await service.list(USER, META, { page: 1, pageSize: 4 });
      const page2 = await service.list(USER, META, { page: 2, pageSize: 4 });

      expect(page1.items.length).toBe(4);
      expect(page2.items.length).toBe(3);
      expect(page2.items[0].code).not.toBe(page1.items[0].code);
    });
  });

  describe("detail", () => {
    it("returns the invoice with resolved customer and computed amounts", async () => {
      const invoice = await service.detail(USER, META, "INV-0005");

      expect(invoice.code).toBe("INV-0005");
      expect(invoice.status).toBe("submitted");
      expect(invoice.customer).toEqual({ code: "CUS-0003", name: "Atlas Facilities" });
      expect(invoice.salesOrderCode).toBe("SO-2041");
      expect(invoice.summary.total).toBe(3340);
      expect(invoice.amountPaid).toBe(0);
    });

    it("throws not_found for an unknown invoice", async () => {
      await expect(service.detail(USER, META, "INV-9999")).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });
  });

  describe("create", () => {
    it("creates the Sales Invoice doc and audits", async () => {
      mocks.client.create.mockResolvedValue({
        name: "INV-0015",
        customer: "CUS-0001",
        posting_date: "2026-08-14 09:00:00",
        docstatus: 0,
        items: [line("PRD-0001", "Alderwood standing desk", 2, 1450, 2900)],
        creation: "2026-08-14 09:00:00",
        modified: "2026-08-14 09:00:00",
      });

      const invoice = await service.create(USER, META, {
        customerCode: "CUS-0001",
        salesOrderCode: "SO-2040",
        items: [{ product: "PRD-0001", qty: 2, rate: 1450 }],
      });

      expect(mocks.client.create).toHaveBeenCalledWith(
        "Sales Invoice",
        expect.objectContaining({
          customer: "CUS-0001",
          currency: "USD",
          sales_order: "SO-2040",
          items: expect.arrayContaining([
            expect.objectContaining({ item_code: "PRD-0001", qty: 2, rate: 1450, uom: "pcs" }),
          ]),
        }),
      );
      expect(invoice.code).toBe("INV-0015");
      expect(invoice.status).toBe("draft");
      expect(invoice.customer.name).toBe("Serenity Interiors");
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "sales_invoice.create", resourceType: "Sales Invoice", resourceId: "INV-0015", companyId: COMPANY, actorId: USER.id }),
      });
    });
  });

  describe("update", () => {
    it("patches a draft invoice and audits", async () => {
      mocks.client.update.mockResolvedValue({ ...INVOICE_DOCS[5], notes: "Hold for approval" });

      const invoice = await service.update(USER, META, "INV-0009", { notes: "Hold for approval" });

      expect(mocks.client.update).toHaveBeenCalledWith(
        "Sales Invoice",
        "INV-0009",
        expect.objectContaining({ notes: "Hold for approval" }),
      );
      expect(invoice.notes).toBe("Hold for approval");
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "sales_invoice.update", resourceId: "INV-0009" }),
      });
    });

    it("rejects updates to a submitted invoice", async () => {
      await expect(service.update(USER, META, "INV-0005", { notes: "revised" })).rejects.toMatchObject({
        code: ErrorCode.UNPROCESSABLE,
      });
    });

    it("throws not_found when the invoice does not exist", async () => {
      await expect(service.update(USER, META, "INV-9999", { notes: "x" })).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });
  });

  describe("changeStatus", () => {
    it("submits an invoice and audits sales_invoice.submit", async () => {
      mocks.client.submit.mockResolvedValue({ ...INVOICE_DOCS[5], docstatus: 1, status: "Unpaid" });

      const invoice = await service.changeStatus(USER, META, "INV-0009", "submitted");

      expect(mocks.client.submit).toHaveBeenCalledWith("Sales Invoice", "INV-0009");
      expect(invoice.status).toBe("submitted");
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "sales_invoice.submit", resourceId: "INV-0009" }),
      });
    });

    it("cancels an invoice and audits sales_invoice.cancel", async () => {
      mocks.client.cancel.mockResolvedValue(INVOICE_DOCS[6]);

      const invoice = await service.changeStatus(USER, META, "INV-0011", "cancelled");

      expect(mocks.client.cancel).toHaveBeenCalledWith("Sales Invoice", "INV-0011");
      expect(invoice.status).toBe("cancelled");
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "sales_invoice.cancel", resourceId: "INV-0011" }),
      });
    });

    it("rejects unsupported status transitions", async () => {
      await expect(service.changeStatus(USER, META, "INV-0005", "paid")).rejects.toMatchObject({
        code: ErrorCode.UNPROCESSABLE,
      });
    });
  });

  describe("recordPayment", () => {
    it("records a payment entry and returns the refreshed invoice", async () => {
      inv0005Doc = { ...INVOICE_DOCS[3], outstanding_amount: 2340 };
      mocks.client.create.mockResolvedValue({ name: "PE-0001", party: "CUS-0003", party_type: "Customer", payment_type: "Receive" });
      mocks.client.submit.mockResolvedValue({ name: "PE-0001" });

      const invoice = await service.recordPayment(USER, META, "INV-0005", { amount: 1000 });

      expect(mocks.client.create).toHaveBeenCalledWith(
        "Payment Entry",
        expect.objectContaining({ party: "CUS-0003", paid_amount: 1000, payment_type: "Receive" }),
      );
      expect(mocks.client.submit).toHaveBeenCalledWith("Payment Entry", "PE-0001");
      expect(invoice.amountPaid).toBe(1000);
      expect(invoice.status).toBe("partially_paid");
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "sales_invoice.record_payment", resourceType: "Sales Invoice", resourceId: "INV-0005" }),
      });
    });

    it("rejects overpayment", async () => {
      await expect(service.recordPayment(USER, META, "INV-0005", { amount: 4000 })).rejects.toMatchObject({
        code: ErrorCode.UNPROCESSABLE,
      });
    });

    it("rejects payments against draft invoices", async () => {
      await expect(service.recordPayment(USER, META, "INV-0009", { amount: 100 })).rejects.toMatchObject({
        code: ErrorCode.UNPROCESSABLE,
      });
    });

    it("throws not_found for an unknown invoice", async () => {
      await expect(service.recordPayment(USER, META, "INV-9999", { amount: 10 })).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });
  });

  describe("remove", () => {
    it("deletes a draft invoice and audits", async () => {
      mocks.client.delete.mockResolvedValue(undefined);

      await service.remove(USER, META, "INV-0009");

      expect(mocks.client.delete).toHaveBeenCalledWith("Sales Invoice", "INV-0009");
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "sales_invoice.remove", resourceType: "Sales Invoice", resourceId: "INV-0009" }),
      });
    });

    it("rejects removal of a submitted invoice", async () => {
      await expect(service.remove(USER, META, "INV-0005")).rejects.toMatchObject({
        code: ErrorCode.UNPROCESSABLE,
      });
    });
  });
});
