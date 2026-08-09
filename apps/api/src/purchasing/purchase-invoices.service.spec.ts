import { describe, expect, it } from "vitest";
import { ErrorCode } from "@amni/shared";

import { PurchaseInvoicesService } from "./purchase-invoices.service";

describe("PurchaseInvoicesService", () => {
  const createService = () => new PurchaseInvoicesService();
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
      expect(result.items[0].number).toBe("PINV-0001");
    });

    it("filters by status", () => {
      const paid = createService().list({ ...baseQuery, status: "paid" });
      const partially = createService().list({ ...baseQuery, status: "partially_paid" });

      expect(paid.meta.total).toBe(3);
      expect(paid.items.every((invoice) => invoice.status === "paid")).toBe(true);
      expect(partially.meta.total).toBe(2);
    });

    it("searches across number and supplier name case-insensitively", () => {
      const result = createService().list({ ...baseQuery, q: "vector" });

      expect(result.meta.total).toBe(1);
      expect(result.items[0].id).toBe("PINV-0006");
    });

    it("paginates", () => {
      const page2 = createService().list({ ...baseQuery, page: 2, pageSize: 4 });

      expect(page2.items.length).toBe(4);
      expect(page2.meta.page).toBe(2);
    });
  });

  describe("getById", () => {
    it("returns the purchase invoice detail with payment totals", () => {
      const detail = createService().getById("PINV-0005");

      expect(detail.id).toBe("PINV-0005");
      expect(detail.supplierName).toBe("Meridian Fabrics");
      expect(detail).toMatchObject({ total: 14_880, paid: 0, outstanding: 14_880 });
    });

    it("throws NOT_FOUND for an unknown id", () => {
      expect(() => createService().getById("PINV-9999")).toThrowError(
        expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
      );
    });
  });
});
