import { describe, expect, it } from "vitest";
import { ErrorCode } from "@amni/shared";

import { SuppliersService } from "./suppliers.service";

describe("SuppliersService", () => {
  const createService = () => new SuppliersService();
  const baseQuery = {
    page: 1,
    pageSize: 20,
    sortBy: undefined,
    sortDir: "asc" as const,
    q: undefined,
    status: undefined,
    territory: undefined,
  };

  describe("list", () => {
    it("returns the first page sorted by name ascending by default", () => {
      const result = createService().list(baseQuery);

      expect(result.items.length).toBe(10);
      expect(result.meta.total).toBe(10);
      expect(result.items[0].name).toBe("Apex Steel");
    });

    it("honors sortBy whitelist and sortDir", () => {
      const result = createService().list({ ...baseQuery, sortBy: "balance", sortDir: "desc" });

      const [first, second] = result.items;
      expect(first.balance).toBeGreaterThanOrEqual(second.balance);
    });

    it("falls back to name when sortBy is not whitelisted", () => {
      const result = createService().list({ ...baseQuery, sortBy: "phone" });

      expect(result.items[0].name).toBe("Apex Steel");
    });

    it("filters by status and territory", () => {
      const service = createService();
      const active = service.list({ ...baseQuery, status: "active" });
      const us = service.list({ ...baseQuery, territory: "United States" });

      expect(active.items.every((supplier) => supplier.status === "active")).toBe(true);
      expect(active.meta.total).toBe(9);
      expect(us.items.every((supplier) => supplier.territory === "United States")).toBe(true);
      expect(us.meta.total).toBe(3);
    });

    it("searches across name, email, territory and group case-insensitively", () => {
      const result = createService().list({ ...baseQuery, q: "lumina" });

      expect(result.meta.total).toBe(1);
      expect(result.items[0].id).toBe("SUP-0001");
    });

    it("paginates", () => {
      const service = createService();
      const page1 = service.list({ ...baseQuery, pageSize: 4 });
      const page2 = service.list({ ...baseQuery, page: 2, pageSize: 4 });

      expect(page1.items.length).toBe(4);
      expect(page1.meta.page).toBe(1);
      expect(page2.items.length).toBe(4);
      expect(page2.items[0].id).not.toBe(page1.items[0].id);
    });
  });

  describe("getById", () => {
    it("returns the supplier detail with derived stats and recent orders", () => {
      const detail = createService().getById("SUP-0001");

      expect(detail.id).toBe("SUP-0001");
      expect(detail.name).toBe("Lumina Supplies");
      expect(detail.stats).toMatchObject({ totalPurchased: 27_350, totalPaid: 18_450, outstanding: 8_900, orderCount: 1 });
      expect(detail.recentOrders.map((order) => order.number)).toEqual(["PO-0001"]);
    });

    it("throws NOT_FOUND for an unknown id", () => {
      expect(() => createService().getById("SUP-9999")).toThrowError(
        expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
      );
    });
  });
});
