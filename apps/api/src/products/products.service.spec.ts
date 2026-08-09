import { describe, expect, it } from "vitest";
import { ErrorCode } from "@amni/shared";

import { ProductsService } from "./products.service";
import { ApiException } from "../common/api.exception";

describe("ProductsService", () => {
  const createService = () => new ProductsService();

  describe("list", () => {
    it("returns the first page sorted by createdAt desc by default", () => {
      const result = createService().list({ page: 1, pageSize: 20 });

      expect(result.meta.total).toBe(18);
      expect(result.items[0].code).toBe("PRD-0018");
    });

    it("honors whitelisted sortBy and sortDir", () => {
      const service = createService();
      const result = service.list({ page: 1, pageSize: 20, sortBy: "price", sortDir: "desc" });

      const [first, second] = result.items;
      expect(first.price).toBeGreaterThanOrEqual(second.price);
    });

    it("sorts by name ascending when requested", () => {
      const result = createService().list({ page: 1, pageSize: 20, sortBy: "name", sortDir: "asc" });

      expect(result.items[0].code).toBe("PRD-0012");
    });

    it("falls back to createdAt when sortBy is not whitelisted", () => {
      const result = createService().list({ page: 1, pageSize: 20, sortBy: "notes", sortDir: "asc" });

      expect(result.items[0].code).toBe("PRD-0018");
    });

    it("filters by category", () => {
      const result = createService().list({ page: 1, pageSize: 20, category: "lighting" });

      expect(result.items.every((product) => product.category === "lighting")).toBe(true);
      expect(result.meta.total).toBe(5);
    });

    it("filters by status", () => {
      const result = createService().list({ page: 1, pageSize: 20, status: "active" });

      expect(result.items.every((product) => product.status === "active")).toBe(true);
      expect(result.meta.total).toBe(16);
    });

    it("searches case-insensitively across name and sku", () => {
      const result = createService().list({ page: 1, pageSize: 20, q: "NIMBUS" });

      expect(result.meta.total).toBe(1);
      expect(result.items[0].code).toBe("PRD-0001");
    });

    it("searches across sku", () => {
      const result = createService().list({ page: 1, pageSize: 20, q: "alu-sht" });

      expect(result.meta.total).toBe(1);
      expect(result.items[0].code).toBe("PRD-0002");
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

  describe("detail", () => {
    it("returns the product with all fields", () => {
      const detail = createService().detail("PRD-0001");

      expect(detail.code).toBe("PRD-0001");
      expect(detail.name).toBe("Nimbus LED Panel");
      expect(detail.currency).toBe("USD");
      expect(detail.status).toBe("active");
    });

    it("throws not_found for an unknown product", () => {
      expect(() => createService().detail("PRD-9999")).toThrowError(
        expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
      );
    });
  });

  describe("create", () => {
    it("assigns the next code and applies schema defaults", () => {
      const service = createService();
      const product = service.create({
        sku: "TST-001",
        name: "Test Widget",
        category: "office",
        price: 99,
      });

      expect(product.code).toBe("PRD-0019");
      expect(product.status).toBe("draft");
      expect(product.currency).toBe("USD");
      expect(product.unit).toBe("pcs");
      expect(product.reorderLevel).toBe(0);
      expect(product.vatRate).toBe(0);
      expect(product.isStockItem).toBe(true);
      expect(product.isSalesItem).toBe(true);
      expect(product.isPurchaseItem).toBe(false);
      expect(service.detail("PRD-0019").name).toBe("Test Widget");
    });

    it("honors explicit values", () => {
      const service = createService();
      const product = service.create({
        sku: "TST-002",
        name: "Test Bundle",
        category: "materials",
        unit: "set",
        price: 250,
        cost: 140,
        status: "active",
        reorderLevel: 8,
        isPurchaseItem: true,
        vatRate: 15,
      });

      expect(product.status).toBe("active");
      expect(product.unit).toBe("set");
      expect(product.reorderLevel).toBe(8);
      expect(product.isPurchaseItem).toBe(true);
      expect(product.vatRate).toBe(15);
    });
  });

  describe("update", () => {
    it("updates scalar fields and refreshes updatedAt", () => {
      const service = createService();
      const product = service.update("PRD-0003", { price: 320, name: "ErgoMesh Task Chair 2" });

      expect(product.price).toBe(320);
      expect(product.name).toBe("ErgoMesh Task Chair 2");
      expect(product.updatedAt >= product.createdAt).toBe(true);
    });

    it("throws not_found when the product does not exist", () => {
      const service = createService();
      expect(() => service.update("PRD-9999", { price: 1 })).toThrowError(
        expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
      );
    });
  });

  describe("remove", () => {
    it("removes the product", () => {
      const service = createService();
      service.remove("PRD-0010");

      expect(service.list({ page: 1, pageSize: 20 }).meta.total).toBe(17);
    });

    it("throws not_found for an unknown product", () => {
      const service = createService();
      expect(() => service.remove("PRD-9999")).toThrowError(ApiException);
    });
  });
});
