import { describe, expect, it } from "vitest";
import { ErrorCode } from "@amni/shared";

import { PurchaseOrdersService } from "./purchase-orders.service";
import { ApiException } from "../common/api.exception";

describe("PurchaseOrdersService", () => {
  const createService = () => new PurchaseOrdersService();

  describe("list", () => {
    it("returns the first page sorted by createdAt desc by default", () => {
      const result = createService().list({ page: 1, pageSize: 20 });

      expect(result.meta.total).toBe(7);
      expect(result.items[0].code).toBe("PO-0007");
    });

    it("filters by status", () => {
      const result = createService().list({ page: 1, pageSize: 20, status: "completed" });

      expect(result.items.every((order) => order.status === "completed")).toBe(true);
      expect(result.meta.total).toBe(2);
    });

    it("searches case-insensitively across supplier name", () => {
      const result = createService().list({ page: 1, pageSize: 20, q: "timber" });

      expect(result.meta.total).toBe(1);
      expect(result.items[0].code).toBe("PO-0001");
    });

    it("paginates", () => {
      const service = createService();
      const page1 = service.list({ page: 1, pageSize: 4 });
      const page2 = service.list({ page: 2, pageSize: 4 });

      expect(page1.items.length).toBe(4);
      expect(page2.items.length).toBe(3);
      expect(page2.items[0]).not.toBe(page1.items[0]);
    });
  });

  describe("detail", () => {
    it("returns the purchase order with all fields", () => {
      const detail = createService().detail("PO-0001");

      expect(detail.code).toBe("PO-0001");
      expect(detail.supplier.code).toBe("SUP-0001");
      expect(detail.status).toBe("completed");
      expect(detail.summary.total).toBeGreaterThan(0);
    });

    it("throws not_found for an unknown purchase order", () => {
      expect(() => createService().detail("PO-9999")).toThrowError(
        expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
      );
    });
  });

  describe("create", () => {
    it("assigns the next code, computes summary, and defaults status to draft", () => {
      const service = createService();
      const order = service.create({
        supplierCode: "SUP-0001",
        items: [
          { product: "PRD-0001", name: "Alderwood standing desk", uom: "pcs", qty: 2, rate: 520 },
        ],
      });

      expect(order.code).toBe("PO-0008");
      expect(order.status).toBe("draft");
      expect(order.summary.total).toBe(1040);
      expect(order.summary.subtotal).toBe(1040);
      expect(order.owner).toBe("Amara Osei");
      expect(service.detail("PO-0008").items.length).toBe(1);
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

  describe("changeStatus", () => {
    it("updates the status", () => {
      const service = createService();
      const order = service.changeStatus("PO-0004", { status: "submitted" });

      expect(order.status).toBe("submitted");
    });

    it("throws not_found when the order does not exist", () => {
      const service = createService();
      expect(() => service.changeStatus("PO-9999", { status: "submitted" })).toThrowError(
        expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
      );
    });
  });

  describe("update", () => {
    it("recomputes summary when items change", () => {
      const service = createService();
      const order = service.update("PO-0004", {
        items: [{ product: "PRD-0005", name: "Boardroom conference table", uom: "pcs", qty: 4, rate: 890 }],
      });

      expect(order.summary.total).toBe(3560);
      expect(order.updatedAt >= order.createdAt).toBe(true);
    });
  });

  describe("remove", () => {
    it("removes the purchase order", () => {
      const service = createService();
      service.remove("PO-0007");

      expect(service.list({ page: 1, pageSize: 20 }).meta.total).toBe(6);
    });

    it("throws not_found for an unknown purchase order", () => {
      const service = createService();
      expect(() => service.remove("PO-9999")).toThrowError(ApiException);
    });
  });
});
