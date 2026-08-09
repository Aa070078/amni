import { describe, expect, it } from "vitest";
import { ErrorCode } from "@amni/shared";

import { WarehousesService } from "./warehouses.service";
import { ApiException } from "../common/api.exception";

describe("WarehousesService", () => {
  const createService = () => new WarehousesService();

  describe("list", () => {
    it("returns the first page sorted by createdAt desc by default", () => {
      const result = createService().list({ page: 1, pageSize: 20 });

      expect(result.meta.total).toBe(6);
      expect(result.items[0].code).toBe("WH-0006");
    });

    it("honors whitelisted sortBy and sortDir", () => {
      const service = createService();
      const result = service.list({ page: 1, pageSize: 20, sortBy: "name", sortDir: "asc" });

      const [first, second] = result.items;
      expect(first.name <= second.name).toBe(true);
      expect(first.name).toBe("E-Commerce Fulfillment");
    });

    it("falls back to createdAt when sortBy is not whitelisted", () => {
      const result = createService().list({ page: 1, pageSize: 20, sortBy: "code", sortDir: "asc" });

      expect(result.items[0].code).toBe("WH-0006");
    });

    it("filters by status", () => {
      const result = createService().list({ page: 1, pageSize: 20, status: "inactive" });

      expect(result.items.every((warehouse) => warehouse.status === "inactive")).toBe(true);
      expect(result.meta.total).toBe(1);
      expect(result.items[0].code).toBe("WH-0004");
    });

    it("searches case-insensitively across name and location", () => {
      const result = createService().list({ page: 1, pageSize: 20, q: "REGIONAL" });

      expect(result.meta.total).toBe(1);
      expect(result.items[0].code).toBe("WH-0002");
    });

    it("paginates", () => {
      const service = createService();
      const page1 = service.list({ page: 1, pageSize: 4 });
      const page2 = service.list({ page: 2, pageSize: 4 });

      expect(page1.items.length).toBe(4);
      expect(page2.items.length).toBe(2);
      expect(page2.items[0]).not.toBe(page1.items[0]);
    });
  });

  describe("detail", () => {
    it("returns the warehouse with its stock and derived lowStock", () => {
      const detail = createService().detail("WH-0001");

      expect(detail.code).toBe("WH-0001");
      expect(detail.stock.length).toBeGreaterThan(0);
      expect(detail.stock.every((row) => row.warehouseCode === "WH-0001")).toBe(true);
      expect(detail.stock.every((row) => row.available === Math.max(0, row.onHand - row.reserved))).toBe(true);
      expect(detail.lowStock.length).toBe(1);
      expect(detail.lowStock[0].productCode).toBe("PRD-0003");
      expect(detail.lowStock[0].onHand).toBeLessThan(detail.lowStock[0].reorderLevel);
    });

    it("returns an empty lowStock list when nothing is below reorder level", () => {
      const detail = createService().detail("WH-0005");

      expect(detail.lowStock.length).toBeGreaterThan(0);
      expect(detail.lowStock.every((row) => row.onHand < row.reorderLevel)).toBe(true);
    });

    it("throws not_found for an unknown warehouse", () => {
      expect(() => createService().detail("WH-9999")).toThrowError(
        expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
      );
    });
  });

  describe("create", () => {
    it("assigns the next code and defaults status to active", () => {
      const service = createService();
      const warehouse = service.create({ name: "Test Warehouse", location: "Test Location" });

      expect(warehouse.code).toBe("WH-0007");
      expect(warehouse.status).toBe("active");
      expect(warehouse.isDefault).toBe(false);
      expect(service.detail("WH-0007").name).toBe("Test Warehouse");
    });

    it("honors explicit status and isDefault", () => {
      const service = createService();
      const warehouse = service.create({
        name: "Test Warehouse",
        manager: "Jane Doe",
        status: "inactive",
        isDefault: true,
      });

      expect(warehouse.status).toBe("inactive");
      expect(warehouse.isDefault).toBe(true);
      expect(warehouse.manager).toBe("Jane Doe");
    });
  });

  describe("update", () => {
    it("updates scalar fields and refreshes updatedAt", () => {
      const service = createService();
      const warehouse = service.update("WH-0003", { name: "Assembly Workshop", manager: "Ada Lovelace" });

      expect(warehouse.name).toBe("Assembly Workshop");
      expect(warehouse.manager).toBe("Ada Lovelace");
      expect(warehouse.updatedAt >= warehouse.createdAt).toBe(true);
    });

    it("throws not_found when the warehouse does not exist", () => {
      const service = createService();
      expect(() => service.update("WH-9999", { name: "Nope" })).toThrowError(
        expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
      );
    });
  });

  describe("remove", () => {
    it("removes the warehouse", () => {
      const service = createService();
      service.remove("WH-0006");

      expect(service.list({ page: 1, pageSize: 20 }).meta.total).toBe(5);
    });

    it("throws not_found for an unknown warehouse", () => {
      const service = createService();
      expect(() => service.remove("WH-9999")).toThrowError(ApiException);
    });
  });
});
