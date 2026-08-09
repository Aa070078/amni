import { describe, expect, it } from "vitest";
import { ErrorCode } from "@amni/shared";

import { QuotationsService } from "./quotations.service";
import { ApiException } from "../common/api.exception";

describe("QuotationsService", () => {
  const createService = () => new QuotationsService();

  describe("list", () => {
    it("returns the first page sorted by createdAt desc by default", () => {
      const result = createService().list({ page: 1, pageSize: 20 });

      expect(result.meta.total).toBe(12);
      expect(result.items[0].code).toBe("QT-0008");
    });

    it("honors whitelisted sortBy and sortDir", () => {
      const service = createService();
      const result = service.list({ page: 1, pageSize: 20, sortBy: "total", sortDir: "desc" });

      const [first, second] = result.items;
      expect(first.summary.total).toBeGreaterThanOrEqual(second.summary.total);
    });

    it("falls back to createdAt when sortBy is not whitelisted", () => {
      const result = createService().list({ page: 1, pageSize: 20, sortBy: "notes", sortDir: "asc" });

      expect(result.items[0].code).toBe("QT-0008");
    });

    it("filters by status", () => {
      const result = createService().list({ page: 1, pageSize: 20, status: "sent" });

      expect(result.items.every((quotation) => quotation.status === "sent")).toBe(true);
      expect(result.meta.total).toBe(3);
    });

    it("searches case-insensitively across customer and items", () => {
      const result = createService().list({ page: 1, pageSize: 20, q: "SERENITY" });

      expect(result.meta.total).toBe(2);
      expect(result.items.map((quotation) => quotation.code)).toEqual(
        expect.arrayContaining(["QT-0001", "QT-0007"]),
      );
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

  describe("options", () => {
    it("returns customers and products for the new-doc dialog", () => {
      const options = createService().options();

      expect(options.customers.length).toBe(6);
      expect(options.customers[0]).toEqual({ code: "CUS-0001", name: "Serenity Interiors" });
      expect(options.products.length).toBe(6);
      expect(options.products[0]).toEqual({
        code: "PRD-0001",
        name: "Ergo Task Chair",
        uom: "pcs",
        rate: 340,
      });
    });
  });

  describe("detail", () => {
    it("returns the quotation with a resolved customer and computed summary", () => {
      const detail = createService().detail("QT-0001");

      expect(detail.customer.name).toBe("Serenity Interiors");
      expect(detail.summary.subtotal).toBe(16800);
      expect(detail.summary.discount).toBe(500);
      expect(detail.summary.tax).toBe(1630);
      expect(detail.summary.total).toBe(17930);
      expect(detail.items.length).toBe(2);
    });

    it("throws not_found for an unknown quotation", () => {
      expect(() => createService().detail("QT-9999")).toThrowError(
        expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
      );
    });
  });

  describe("create", () => {
    it("assigns the next code, defaults to draft and computes the summary", () => {
      const service = createService();
      const quotation = service.create({
        customerCode: "CUS-0001",
        items: [{ product: "PRD-0001", qty: 2, rate: 100 }],
      });

      expect(quotation.code).toBe("QT-0013");
      expect(quotation.status).toBe("draft");
      expect(quotation.currency).toBe("USD");
      expect(quotation.customer.name).toBe("Serenity Interiors");
      expect(quotation.items[0].lineNo).toBe(1);
      expect(quotation.items[0].uom).toBe("pcs");
      expect(quotation.summary.subtotal).toBe(200);
      expect(quotation.summary.tax).toBe(20);
      expect(quotation.summary.total).toBe(220);
      expect(service.detail("QT-0013").code).toBe("QT-0013");
    });

    it("orders codes sequentially", () => {
      const service = createService();
      service.create({ customerCode: "CUS-0001", items: [{ product: "PRD-0001", qty: 1, rate: 10 }] });

      expect(service.create({ customerCode: "CUS-0002", items: [{ product: "PRD-0002", qty: 1, rate: 20 }] }).code).toBe(
        "QT-0014",
      );
    });

    it("throws not_found for an unknown customer", () => {
      expect(() =>
        createService().create({
          customerCode: "CUS-9999",
          items: [{ product: "PRD-0001", qty: 1, rate: 10 }],
        }),
      ).toThrowError(expect.objectContaining({ code: ErrorCode.NOT_FOUND }));
    });
  });

  describe("changeStatus", () => {
    it("updates the status and refreshes updatedAt", () => {
      const service = createService();
      const quotation = service.changeStatus("QT-0002", "sent");

      expect(quotation.status).toBe("sent");
      expect(quotation.updatedAt >= quotation.createdAt).toBe(true);
    });

    it("throws not_found when the quotation does not exist", () => {
      expect(() => createService().changeStatus("QT-9999", "sent")).toThrowError(ApiException);
    });
  });

  describe("update", () => {
    it("updates scalars and refreshes updatedAt", () => {
      const service = createService();
      const quotation = service.update("QT-0002", { notes: "Revised pricing" });

      expect(quotation.notes).toBe("Revised pricing");
      expect(quotation.updatedAt >= quotation.createdAt).toBe(true);
    });

    it("recomputes the summary when items change", () => {
      const service = createService();
      const quotation = service.update("QT-0002", {
        items: [{ product: "PRD-0003", qty: 10, rate: 45 }],
      });

      expect(quotation.summary.subtotal).toBe(450);
      expect(quotation.summary.tax).toBe(45);
      expect(quotation.summary.total).toBe(495);
    });

    it("throws not_found when the quotation does not exist", () => {
      expect(() => createService().update("QT-9999", { notes: "x" })).toThrowError(
        expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
      );
    });
  });

  describe("remove", () => {
    it("removes the quotation", () => {
      const service = createService();
      service.remove("QT-0010");

      expect(service.list({ page: 1, pageSize: 20 }).meta.total).toBe(11);
    });

    it("throws not_found for an unknown quotation", () => {
      expect(() => createService().remove("QT-9999")).toThrowError(ApiException);
    });
  });
});
