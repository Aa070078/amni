import { describe, expect, it } from "vitest";
import { ErrorCode } from "@amni/shared";

import { SalesInvoicesService } from "./sales-invoices.service";
import { ApiException } from "../common/api.exception";

describe("SalesInvoicesService", () => {
  const createService = () => new SalesInvoicesService();
  const all = (service: SalesInvoicesService) => service.list({ page: 1, pageSize: 100 }).items;

  describe("list", () => {
    it("returns the first page sorted by createdAt desc by default", () => {
      const result = createService().list({ page: 1, pageSize: 20 });

      expect(result.meta.total).toBe(14);
      expect(result.items[0].code).toBe("INV-0014");
    });

    it("honors whitelisted sortBy and sortDir", () => {
      const result = createService().list({ page: 1, pageSize: 100, sortBy: "total", sortDir: "desc" });

      const [first, second] = result.items;
      expect(first.summary.total).toBeGreaterThanOrEqual(second.summary.total);
    });

    it("sorts by customer name", () => {
      const result = createService().list({ page: 1, pageSize: 100, sortBy: "customer", sortDir: "asc" });

      const names = result.items.map((invoice) => invoice.customer.name);
      expect([...names].sort()).toEqual(names);
    });

    it("filters by status", () => {
      const result = createService().list({ page: 1, pageSize: 100, status: "paid" });

      expect(result.items.every((invoice) => invoice.status === "paid")).toBe(true);
      expect(result.meta.total).toBe(4);
    });

    it("searches case-insensitively across customer and code", () => {
      const result = createService().list({ page: 1, pageSize: 100, q: "HARBOR" });

      expect(result.meta.total).toBe(2);
      expect(result.items.every((invoice) => invoice.customer.code === "CUS-0006")).toBe(true);
    });

    it("paginates", () => {
      const service = createService();
      const page1 = service.list({ page: 1, pageSize: 6 });
      const page2 = service.list({ page: 2, pageSize: 6 });

      expect(page1.items.length).toBe(6);
      expect(page2.items.length).toBe(6);
      expect(page2.items[0]).not.toBe(page1.items[0]);
    });
  });

  describe("summary", () => {
    it("computes outstanding, month billed, overdue and count from records", () => {
      const service = createService();
      const summary = service.summary();
      const items = all(service);
      const now = Date.now();
      const current = new Date();

      const outstanding = items
        .filter((invoice) => ["submitted", "partially_paid", "overdue"].includes(invoice.status))
        .reduce((sum, invoice) => sum + (invoice.summary.total - invoice.amountPaid), 0);
      const overdue = items
        .filter((invoice) => {
          if (invoice.status === "draft" || invoice.status === "paid" || invoice.status === "cancelled") return false;
          return invoice.summary.total > invoice.amountPaid && new Date(invoice.dueDate).getTime() < now;
        })
        .reduce((sum, invoice) => sum + (invoice.summary.total - invoice.amountPaid), 0);
      const monthBilled = items
        .filter((invoice) => {
          if (invoice.status === "cancelled") return false;
          const issued = new Date(invoice.date);
          return issued.getFullYear() === current.getFullYear() && issued.getMonth() === current.getMonth();
        })
        .reduce((sum, invoice) => sum + invoice.summary.total, 0);
      const count = items.filter((invoice) => invoice.status !== "cancelled").length;

      expect(summary.outstanding).toBe(outstanding);
      expect(summary.overdue).toBe(overdue);
      expect(summary.monthBilled).toBe(monthBilled);
      expect(summary.count).toBe(count);
      expect(summary.currency).toBe("USD");
    });
  });

  describe("options", () => {
    it("returns customers and products from seed", () => {
      const options = createService().options();

      expect(options.customers.length).toBe(10);
      expect(options.products.length).toBe(8);
      expect(options.customers[0]).toEqual({ code: "CUS-0001", name: "Serenity Interiors" });
      expect(options.products[0].code).toBe("PRD-0001");
    });
  });

  describe("detail", () => {
    it("returns the invoice", () => {
      const detail = createService().detail("INV-0001");

      expect(detail.code).toBe("INV-0001");
      expect(detail.status).toBe("paid");
      expect(detail.amountPaid).toBe(detail.summary.total);
    });

    it("throws not_found for an unknown invoice", () => {
      expect(() => createService().detail("INV-9999")).toThrowError(
        expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
      );
    });
  });

  describe("create", () => {
    it("assigns the next code, defaults to draft and computes lines + summary", () => {
      const service = createService();
      const invoice = service.create({
        customerCode: "CUS-0001",
        items: [
          { product: "PRD-0001", name: "Alderwood standing desk", qty: 2, rate: 1450 },
          { product: "PRD-0002", name: "Aria ergonomic chair", qty: 3, rate: 620 },
        ],
      });

      expect(invoice.code).toBe("INV-0015");
      expect(invoice.status).toBe("draft");
      expect(invoice.customer).toEqual({ code: "CUS-0001", name: "Serenity Interiors" });
      expect(invoice.currency).toBe("USD");
      expect(invoice.amountPaid).toBe(0);
      expect(invoice.items.map((item) => item.amount)).toEqual([2900, 1860]);
      expect(invoice.items[0].lineNo).toBe(1);
      expect(invoice.summary.subtotal).toBe(4760);
      expect(invoice.summary.total).toBe(4760);
      expect(service.detail("INV-0015").code).toBe("INV-0015");
    });

    it("throws not_found when the customer is unknown", () => {
      const service = createService();
      expect(() =>
        service.create({ customerCode: "CUS-9999", items: [{ product: "PRD-0001", qty: 1, rate: 10 }] }),
      ).toThrowError(expect.objectContaining({ code: ErrorCode.NOT_FOUND }));
    });
  });

  describe("update / changeStatus", () => {
    it("updates scalar fields and refreshes updatedAt", () => {
      const service = createService();
      const invoice = service.update("INV-0009", { notes: "Hold for approval" });

      expect(invoice.notes).toBe("Hold for approval");
      expect(invoice.updatedAt >= invoice.createdAt).toBe(true);
    });

    it("recomputes summary when items change", () => {
      const service = createService();
      const invoice = service.update("INV-0009", {
        items: [{ product: "PRD-0005", name: "Boardroom conference table", qty: 1, rate: 2200 }],
      });

      expect(invoice.items.length).toBe(1);
      expect(invoice.summary.total).toBe(2200);
    });

    it("changeStatus sets the status", () => {
      const service = createService();
      const invoice = service.changeStatus("INV-0009", { status: "submitted" });

      expect(invoice.status).toBe("submitted");
    });

    it("throws not_found when the invoice does not exist", () => {
      expect(() => createService().update("INV-9999", { notes: "x" })).toThrowError(
        expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
      );
    });
  });

  describe("recordPayment", () => {
    it("adds to amountPaid and sets status to partially_paid", () => {
      const service = createService();
      const invoice = service.recordPayment("INV-0005", { amount: 1000 });

      expect(invoice.amountPaid).toBe(1000);
      expect(invoice.status).toBe("partially_paid");
    });

    it("flips to paid when the full balance is paid", () => {
      const service = createService();
      const before = service.detail("INV-0005");
      const remaining = before.summary.total - before.amountPaid;

      const invoice = service.recordPayment("INV-0005", { amount: remaining });

      expect(invoice.amountPaid).toBe(invoice.summary.total);
      expect(invoice.status).toBe("paid");
    });

    it("keeps a cancelled invoice cancelled", () => {
      const service = createService();
      const invoice = service.recordPayment("INV-0011", { amount: 100 });

      expect(invoice.amountPaid).toBe(100);
      expect(invoice.status).toBe("cancelled");
    });

    it("rejects overpayment", () => {
      const service = createService();
      const before = service.detail("INV-0005");

      expect(() => service.recordPayment("INV-0005", { amount: before.summary.total + 1 })).toThrowError(
        expect.objectContaining({ code: ErrorCode.UNPROCESSABLE }),
      );
    });

    it("throws not_found for an unknown invoice", () => {
      expect(() => createService().recordPayment("INV-9999", { amount: 10 })).toThrowError(ApiException);
    });
  });

  describe("remove", () => {
    it("removes the invoice", () => {
      const service = createService();
      service.remove("INV-0011");

      expect(service.list({ page: 1, pageSize: 100 }).meta.total).toBe(13);
    });

    it("throws not_found for an unknown invoice", () => {
      expect(() => createService().remove("INV-9999")).toThrowError(ApiException);
    });
  });
});
