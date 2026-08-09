import { describe, expect, it } from "vitest";
import { ErrorCode } from "@amni/shared";

import { SuppliersService } from "./suppliers.service";
import { ApiException } from "../common/api.exception";

describe("SuppliersService", () => {
  const createService = () => new SuppliersService();

  describe("list", () => {
    it("returns the first page sorted by createdAt desc by default", () => {
      const result = createService().list({ page: 1, pageSize: 20 });

      expect(result.meta.total).toBe(8);
      expect(result.items[0].code).toBe("SUP-0008");
    });

    it("sorts by name ascending when requested", () => {
      const result = createService().list({ page: 1, pageSize: 20, sortBy: "name", sortDir: "asc" });

      expect(result.items[0].code).toBe("SUP-0006");
    });

    it("filters by status", () => {
      const result = createService().list({ page: 1, pageSize: 20, status: "inactive" });

      expect(result.items.every((supplier) => supplier.status === "inactive")).toBe(true);
      expect(result.meta.total).toBe(1);
    });

    it("searches case-insensitively across name and group", () => {
      const result = createService().list({ page: 1, pageSize: 20, q: "timber" });

      expect(result.meta.total).toBe(1);
      expect(result.items[0].code).toBe("SUP-0001");
    });

    it("paginates", () => {
      const service = createService();
      const page1 = service.list({ page: 1, pageSize: 4 });
      const page2 = service.list({ page: 2, pageSize: 4 });

      expect(page1.items.length).toBe(4);
      expect(page2.items.length).toBe(4);
      expect(page2.items[0]).not.toBe(page1.items[0]);
    });
  });

  describe("detail", () => {
    it("returns the supplier with all fields", () => {
      const detail = createService().detail("SUP-0001");

      expect(detail.code).toBe("SUP-0001");
      expect(detail.name).toBe("Nordic Timberworks");
      expect(detail.currency).toBe("EUR");
      expect(detail.status).toBe("active");
    });

    it("throws not_found for an unknown supplier", () => {
      expect(() => createService().detail("SUP-9999")).toThrowError(
        expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
      );
    });
  });

  describe("create", () => {
    it("assigns the next code and applies schema defaults", () => {
      const service = createService();
      const supplier = service.create({ name: "Test Vendor", group: "General" });

      expect(supplier.code).toBe("SUP-0009");
      expect(supplier.status).toBe("active");
      expect(supplier.currency).toBe("USD");
      expect(supplier.outstanding).toBe(0);
      expect(supplier.totalPurchases).toBe(0);
      expect(service.detail("SUP-0009").name).toBe("Test Vendor");
    });
  });

  describe("update", () => {
    it("updates scalar fields and refreshes updatedAt", () => {
      const service = createService();
      const supplier = service.update("SUP-0002", { outstanding: 0, paymentTerms: "Net 45" });

      expect(supplier.outstanding).toBe(0);
      expect(supplier.paymentTerms).toBe("Net 45");
      expect(supplier.updatedAt >= supplier.createdAt).toBe(true);
    });

    it("throws not_found when the supplier does not exist", () => {
      const service = createService();
      expect(() => service.update("SUP-9999", { name: "X" })).toThrowError(
        expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
      );
    });
  });

  describe("remove", () => {
    it("removes the supplier", () => {
      const service = createService();
      service.remove("SUP-0008");

      expect(service.list({ page: 1, pageSize: 20 }).meta.total).toBe(7);
    });

    it("throws not_found for an unknown supplier", () => {
      const service = createService();
      expect(() => service.remove("SUP-9999")).toThrowError(ApiException);
    });
  });
});
