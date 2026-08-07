import { describe, expect, it } from "vitest";
import { ErrorCode } from "@amni/shared";

import { SalesService } from "./sales.service";

describe("SalesService", () => {
  const createService = () => new SalesService();

  describe("list", () => {
    it("returns the first page sorted by name ascending by default", () => {
      const result = createService().list({ page: 1, pageSize: 20, sortBy: undefined, sortDir: "asc", q: undefined, status: undefined, type: undefined });

      expect(result.items.length).toBe(10);
      expect(result.meta.total).toBe(10);
      expect(result.items[0].name).toBe("Atlas Facilities");
    });

    it("honors sortBy whitelist and sortDir", () => {
      const result = createService().list({ page: 1, pageSize: 20, sortBy: "outstanding", sortDir: "desc", q: undefined, status: undefined, type: undefined });

      const [first, second] = result.items;
      expect(first.outstanding).toBeGreaterThanOrEqual(second.outstanding);
    });

    it("falls back to name when sortBy is not whitelisted", () => {
      const result = createService().list({ page: 1, pageSize: 20, sortBy: "phone", sortDir: "asc", q: undefined, status: undefined, type: undefined });

      expect(result.items[0].name).toBe("Atlas Facilities");
    });

    it("filters by status and type", () => {
      const service = createService();
      const active = service.list({ page: 1, pageSize: 20, sortBy: undefined, sortDir: "asc", q: undefined, status: "active", type: undefined });
      const companies = service.list({ page: 1, pageSize: 20, sortBy: undefined, sortDir: "asc", q: undefined, status: undefined, type: "company" });

      expect(active.items.every((customer) => customer.status === "active")).toBe(true);
      expect(active.meta.total).toBe(8);
      expect(companies.items.every((customer) => customer.type === "company")).toBe(true);
      expect(companies.meta.total).toBe(6);
    });

    it("searches across name, email, phone and city case-insensitively", () => {
      const result = createService().list({ page: 1, pageSize: 20, sortBy: undefined, sortDir: "asc", q: "serenity", status: undefined, type: undefined });

      expect(result.meta.total).toBe(1);
      expect(result.items[0].id).toBe("CUS-0001");
    });

    it("paginates", () => {
      const service = createService();
      const page1 = service.list({ page: 1, pageSize: 4, sortBy: undefined, sortDir: "asc", q: undefined, status: undefined, type: undefined });
      const page2 = service.list({ page: 2, pageSize: 4, sortBy: undefined, sortDir: "asc", q: undefined, status: undefined, type: undefined });

      expect(page1.items.length).toBe(4);
      expect(page1.meta.page).toBe(1);
      expect(page2.items.length).toBe(4);
      expect(page2.items[0]).not.toBe(page1.items[0]);
    });
  });

  describe("getById", () => {
    it("returns the customer detail with recent orders", () => {
      const detail = createService().getById("CUS-0001");

      expect(detail.id).toBe("CUS-0001");
      expect(detail.name).toBe("Serenity Interiors");
      expect(detail.recentOrders.length).toBeGreaterThan(0);
      expect(detail.recentOrders[0]).toMatchObject({ number: "SO-2041" });
    });

    it("throws NOT_FOUND for an unknown id", () => {
      expect(() => createService().getById("CUS-9999")).toThrowError(
        expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
      );
    });
  });

  describe("create", () => {
    it("creates an active customer with zero totals and default currency", () => {
      const service = createService();
      const created = service.create({ name: "Acme Corp", email: "billing@acme.test", type: "company", currency: "USD" });

      expect(created).toMatchObject({
        name: "Acme Corp",
        email: "billing@acme.test",
        status: "active",
        type: "company",
        currency: "USD",
        totalOrders: 0,
        totalValue: 0,
        outstanding: 0,
      });
      expect(created.id).toMatch(/^CUS-\d{4}$/);
      expect(service.list({ page: 1, pageSize: 20, sortBy: undefined, sortDir: "asc", q: "acme", status: undefined, type: undefined }).meta.total).toBe(1);
    });
  });

  describe("update", () => {
    it("merges fields and bumps updatedAt", () => {
      const service = createService();
      const before = service.getById("CUS-0001");
      const updated = service.update("CUS-0001", { status: "inactive", city: "Oakland" });

      expect(updated).toMatchObject({ id: "CUS-0001", status: "inactive", city: "Oakland", name: before.name });
      expect(updated.updatedAt >= before.updatedAt).toBe(true);
    });

    it("throws NOT_FOUND for an unknown id", () => {
      expect(() => createService().update("CUS-9999", { status: "inactive" })).toThrowError(
        expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
      );
    });
  });
});
