import { describe, expect, it } from "vitest";
import { ErrorCode } from "@amni/shared";

import { CustomersService } from "./customers.service";
import { ApiException } from "../common/api.exception";

describe("CustomersService", () => {
  const createService = () => new CustomersService();

  describe("list", () => {
    it("returns the first page sorted by createdAt desc by default", () => {
      const result = createService().list({ page: 1, pageSize: 20 });

      expect(result.meta.total).toBe(12);
      expect(result.items[0].code).toBe("CUS-0012");
    });

    it("sorts by name ascending when requested", () => {
      const result = createService().list({ page: 1, pageSize: 20, sortBy: "name", sortDir: "asc" });

      expect(result.items[0].code).toBe("CUS-0008");
    });

    it("sorts by outstanding descending", () => {
      const result = createService().list({ page: 1, pageSize: 20, sortBy: "outstanding", sortDir: "desc" });

      expect(result.items[0].code).toBe("CUS-0010");
    });

    it("filters by status", () => {
      const result = createService().list({ page: 1, pageSize: 20, status: "inactive" });

      expect(result.items.every((customer) => customer.status === "inactive")).toBe(true);
      expect(result.meta.total).toBe(1);
    });

    it("searches case-insensitively across name and group", () => {
      const result = createService().list({ page: 1, pageSize: 20, q: "serenity" });

      expect(result.meta.total).toBe(1);
      expect(result.items[0].code).toBe("CUS-0001");
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
    it("returns the customer with all fields", () => {
      const detail = createService().detail("CUS-0001");

      expect(detail.code).toBe("CUS-0001");
      expect(detail.name).toBe("Serenity Interiors");
      expect(detail.currency).toBe("GBP");
      expect(detail.status).toBe("active");
      expect(detail.type).toBe("company");
    });

    it("throws not_found for an unknown customer", () => {
      expect(() => createService().detail("CUS-9999")).toThrowError(
        expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
      );
    });
  });

  describe("create", () => {
    it("assigns the next code and applies schema defaults", () => {
      const service = createService();
      const customer = service.create({ name: "Test Client", group: "General" });

      expect(customer.code).toBe("CUS-0013");
      expect(customer.type).toBe("company");
      expect(customer.group).toBe("General");
      expect(customer.status).toBe("active");
      expect(customer.currency).toBe("USD");
      expect(customer.outstanding).toBe(0);
      expect(customer.totalSales).toBe(0);
      expect(service.detail("CUS-0013").name).toBe("Test Client");
    });

    it("honors explicit values", () => {
      const service = createService();
      const customer = service.create({
        name: "Acme Ltd",
        type: "company",
        group: "Wholesale",
        currency: "EUR",
        status: "active",
        territory: "Paris",
        email: "billing@acme.example",
        paymentTerms: "Net 60",
        outstanding: 1200,
        totalSales: 5000,
      });

      expect(customer.type).toBe("company");
      expect(customer.currency).toBe("EUR");
      expect(customer.paymentTerms).toBe("Net 60");
      expect(customer.outstanding).toBe(1200);
      expect(customer.totalSales).toBe(5000);
    });
  });

  describe("update", () => {
    it("updates scalar fields and refreshes updatedAt", () => {
      const service = createService();
      const customer = service.update("CUS-0003", { outstanding: 0, paymentTerms: "30 days" });

      expect(customer.outstanding).toBe(0);
      expect(customer.paymentTerms).toBe("30 days");
      expect(customer.updatedAt >= customer.createdAt).toBe(true);
    });

    it("throws not_found when the customer does not exist", () => {
      const service = createService();
      expect(() => service.update("CUS-9999", { name: "X" })).toThrowError(
        expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
      );
    });
  });

  describe("remove", () => {
    it("removes the customer", () => {
      const service = createService();
      service.remove("CUS-0012");

      expect(service.list({ page: 1, pageSize: 20 }).meta.total).toBe(11);
    });

    it("throws not_found for an unknown customer", () => {
      const service = createService();
      expect(() => service.remove("CUS-9999")).toThrowError(ApiException);
    });
  });
});
