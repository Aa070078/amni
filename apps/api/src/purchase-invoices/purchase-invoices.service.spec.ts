import { describe, expect, it } from "vitest";
import { ErrorCode } from "@amni/shared";

import { PurchaseInvoicesService } from "./purchase-invoices.service";
import { ApiException } from "../common/api.exception";

describe("PurchaseInvoicesService", () => {
  const createService = () => new PurchaseInvoicesService();

  describe("list", () => {
    it("returns the first page sorted by createdAt desc by default", () => {
      const result = createService().list({ page: 1, pageSize: 20 });

      expect(result.meta.total).toBe(6);
      expect(result.items[0].code).toBe("PINV-0006");
    });

    it("filters by status", () => {
      const result = createService().list({ page: 1, pageSize: 20, status: "paid" });

      expect(result.items.every((invoice) => invoice.status === "paid")).toBe(true);
      expect(result.meta.total).toBe(2);
    });

    it("searches case-insensitively across supplier name", () => {
      const result = createService().list({ page: 1, pageSize: 20, q: "fleetline" });

      expect(result.meta.total).toBe(1);
      expect(result.items[0].code).toBe("PINV-0002");
    });
  });

  describe("detail", () => {
    it("returns the purchase invoice with all fields", () => {
      const detail = createService().detail("PINV-0001");

      expect(detail.code).toBe("PINV-0001");
      expect(detail.supplier.code).toBe("SUP-0001");
      expect(detail.status).toBe("paid");
      expect(detail.amountPaid).toBe(detail.summary.total);
    });

    it("throws not_found for an unknown purchase invoice", () => {
      expect(() => createService().detail("PINV-9999")).toThrowError(
        expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
      );
    });
  });

  describe("create", () => {
    it("assigns the next code and defaults status to draft", () => {
      const service = createService();
      const invoice = service.create({
        supplierCode: "SUP-0001",
        items: [{ product: "PRD-0001", name: "Alderwood standing desk", uom: "pcs", qty: 3, rate: 520 }],
      });

      expect(invoice.code).toBe("PINV-0007");
      expect(invoice.status).toBe("draft");
      expect(invoice.summary.total).toBe(1560);
      expect(invoice.amountPaid).toBe(0);
    });

    it("throws not_found for an unknown supplier", () => {
      const service = createService();
      expect(() =>
        service.create({
          supplierCode: "SUP-9999",
          items: [{ product: "PRD-0001", qty: 1, rate: 10 }],
        }),
      ).toThrowError(expect.objectContaining({ code: ErrorCode.NOT_FOUND }));
    });
  });

  describe("recordPayment", () => {
    it("marks the invoice paid when fully settled", () => {
      const service = createService();
      const invoice = service.recordPayment("PINV-0003", { amount: 3200 });

      expect(invoice.amountPaid).toBe(3200);
      expect(invoice.status).toBe("paid");
    });

    it("marks the invoice partially paid", () => {
      const service = createService();
      const invoice = service.recordPayment("PINV-0003", { amount: 1000 });

      expect(invoice.amountPaid).toBe(1000);
      expect(invoice.status).toBe("partially_paid");
    });

    it("rejects payments that exceed the remaining balance", () => {
      const service = createService();
      expect(() => service.recordPayment("PINV-0003", { amount: 99999 })).toThrowError(
        expect.objectContaining({ code: ErrorCode.UNPROCESSABLE }),
      );
    });

    it("throws not_found when the invoice does not exist", () => {
      const service = createService();
      expect(() => service.recordPayment("PINV-9999", { amount: 100 })).toThrowError(
        expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
      );
    });
  });

  describe("changeStatus", () => {
    it("updates the status", () => {
      const service = createService();
      const invoice = service.changeStatus("PINV-0006", { status: "paid" });

      expect(invoice.status).toBe("paid");
    });

    it("throws not_found when the invoice does not exist", () => {
      const service = createService();
      expect(() => service.changeStatus("PINV-9999", { status: "paid" })).toThrowError(
        expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
      );
    });
  });

  describe("remove", () => {
    it("removes the purchase invoice", () => {
      const service = createService();
      service.remove("PINV-0006");

      expect(service.list({ page: 1, pageSize: 20 }).meta.total).toBe(5);
    });

    it("throws not_found for an unknown purchase invoice", () => {
      const service = createService();
      expect(() => service.remove("PINV-9999")).toThrowError(ApiException);
    });
  });
});
