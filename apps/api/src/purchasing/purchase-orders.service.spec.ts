import { describe, expect, it } from "vitest";
import { ErrorCode } from "@amni/shared";

import { PurchaseOrdersService } from "./purchase-orders.service";

describe("PurchaseOrdersService", () => {
  const createService = () => new PurchaseOrdersService();
  const baseQuery = {
    page: 1,
    pageSize: 20,
    sortBy: undefined,
    sortDir: "asc" as const,
    q: undefined,
    status: undefined,
    supplierId: undefined,
  };

  describe("list", () => {
    it("returns the first page sorted by number ascending by default", () => {
      const result = createService().list(baseQuery);

      expect(result.items.length).toBe(10);
      expect(result.meta.total).toBe(10);
      expect(result.items[0].number).toBe("PO-0001");
    });

    it("filters by status and supplier", () => {
      const service = createService();
      const received = service.list({ ...baseQuery, status: "received" });
      const lumina = service.list({ ...baseQuery, supplierId: "SUP-0001" });

      expect(received.items.every((order) => order.status === "received")).toBe(true);
      expect(received.meta.total).toBe(3);
      expect(lumina.items.every((order) => order.supplierId === "SUP-0001")).toBe(true);
      expect(lumina.meta.total).toBe(1);
    });

    it("searches across number and supplier name case-insensitively", () => {
      const result = createService().list({ ...baseQuery, q: "helio" });

      expect(result.meta.total).toBe(1);
      expect(result.items[0].id).toBe("PO-0010");
    });

    it("paginates", () => {
      const page2 = createService().list({ ...baseQuery, page: 2, pageSize: 4 });

      expect(page2.items.length).toBe(4);
      expect(page2.meta.page).toBe(2);
    });
  });

  describe("getById", () => {
    it("returns the purchase order detail with items", () => {
      const detail = createService().getById("PO-0002");

      expect(detail.id).toBe("PO-0002");
      expect(detail.supplierName).toBe("Apex Steel");
      expect(detail.total).toBe(22_600);
      expect(detail.items.length).toBe(2);
    });

    it("throws NOT_FOUND for an unknown id", () => {
      expect(() => createService().getById("PO-9999")).toThrowError(
        expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
      );
    });
  });
});
