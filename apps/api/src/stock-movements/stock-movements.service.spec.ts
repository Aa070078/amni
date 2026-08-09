import { describe, expect, it } from "vitest";

import { StockMovementsService } from "./stock-movements.service";

describe("StockMovementsService", () => {
  const createService = () => new StockMovementsService();

  describe("list", () => {
    it("returns the first page sorted by date desc by default", () => {
      const result = createService().list({ page: 1, pageSize: 20 });

      expect(result.meta.total).toBe(16);
      expect(result.items[0].code).toBe("MOV-0016");
    });

    it("honors whitelisted sortBy and sortDir", () => {
      const service = createService();
      const result = service.list({ page: 1, pageSize: 20, sortBy: "quantity", sortDir: "desc" });

      const [first, second] = result.items;
      expect(first.quantity).toBeGreaterThanOrEqual(second.quantity);
    });

    it("falls back to date when sortBy is not whitelisted", () => {
      const result = createService().list({ page: 1, pageSize: 20, sortBy: "reason", sortDir: "asc" });

      expect(result.items[0].code).toBe("MOV-0001");
    });

    it("filters by type", () => {
      const result = createService().list({ page: 1, pageSize: 20, type: "out" });

      expect(result.items.every((movement) => movement.type === "out")).toBe(true);
      expect(result.meta.total).toBe(4);
    });

    it("filters by productCode", () => {
      const result = createService().list({ page: 1, pageSize: 20, productCode: "PRD-0001" });

      expect(result.items.every((movement) => movement.productCode === "PRD-0001")).toBe(true);
      expect(result.meta.total).toBe(4);
    });

    it("searches case-insensitively across references", () => {
      const result = createService().list({ page: 1, pageSize: 20, q: "so-2040" });

      expect(result.meta.total).toBe(1);
      expect(result.items[0].code).toBe("MOV-0003");
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

  describe("create", () => {
    it("assigns the next code, defaults uom and createdBy, derives productName", () => {
      const service = createService();
      const movement = service.create({
        type: "in",
        productCode: "PRD-0001",
        quantity: 25,
        toWarehouse: "WH-0001",
        reason: "Received stock",
      });

      expect(movement.code).toBe("MOV-0017");
      expect(movement.uom).toBe("pcs");
      expect(movement.createdBy).toBe("Amara Osei");
      expect(movement.productName).toBe("Ergonomic Office Chair");
      expect(service.list({ page: 1, pageSize: 20 }).meta.total).toBe(17);
    });

    it("assigns a date and preserves optional fields", () => {
      const service = createService();
      const movement = service.create({
        type: "transfer",
        productCode: "PRD-0003",
        quantity: 10,
        fromWarehouse: "WH-0001",
        toWarehouse: "WH-0002",
        reference: "TRN-0091",
      });

      expect(movement.date).toBeDefined();
      expect(movement.fromWarehouse).toBe("WH-0001");
      expect(movement.toWarehouse).toBe("WH-0002");
      expect(movement.reference).toBe("TRN-0091");
    });

    it("falls back to a generic productName for unknown codes", () => {
      const service = createService();
      const movement = service.create({ type: "adjust", productCode: "PRD-9999", quantity: 2 });

      expect(movement.productName).toBe("Product PRD-9999");
    });
  });
});
