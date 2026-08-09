import { describe, expect, it } from "vitest";
import { ErrorCode } from "@amni/shared";

import { SalesOrdersService } from "./sales-orders.service";
import { ApiException } from "../common/api.exception";

describe("SalesOrdersService", () => {
  const createService = () => new SalesOrdersService();
  const all = (service: SalesOrdersService) => service.list({ page: 1, pageSize: 100 }).items;

  describe("list", () => {
    it("returns the first page sorted by createdAt desc by default", () => {
      const result = createService().list({ page: 1, pageSize: 20 });

      expect(result.meta.total).toBe(14);
      expect(result.items[0].code).toBe("SO-2043");
    });

    it("honors whitelisted sortBy and sortDir", () => {
      const result = createService().list({ page: 1, pageSize: 100, sortBy: "total", sortDir: "desc" });

      const [first, second] = result.items;
      expect(first.summary.total).toBeGreaterThanOrEqual(second.summary.total);
    });

    it("sorts by customer name", () => {
      const result = createService().list({ page: 1, pageSize: 100, sortBy: "customer", sortDir: "asc" });

      const names = result.items.map((order) => order.customer.name);
      expect([...names].sort()).toEqual(names);
    });

    it("filters by status", () => {
      const result = createService().list({ page: 1, pageSize: 100, status: "cancelled" });

      expect(result.items.every((order) => order.status === "cancelled")).toBe(true);
      expect(result.meta.total).toBe(2);
    });

    it("searches case-insensitively across customer and code", () => {
      const result = createService().list({ page: 1, pageSize: 100, q: "HARBOR" });

      expect(result.meta.total).toBe(1);
      expect(result.items[0].code).toBe("SO-2040");
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

  describe("options", () => {
    it("returns customers and products from seed", () => {
      const options = createService().options();

      expect(options.customers.length).toBe(10);
      expect(options.products.length).toBe(8);
      expect(options.customers[0]).toEqual({ code: "CUS-0001", name: "Serenity Interiors" });
      expect(options.products[0].code).toBe("PRD-0001");
    });
  });

  describe("detail", () => {
    it("returns the order", () => {
      const detail = createService().detail("SO-2040");

      expect(detail.code).toBe("SO-2040");
      expect(detail.status).toBe("delivered");
      expect(detail.customer.code).toBe("CUS-0006");
      expect(detail.summary.total).toBe(5380);
    });

    it("throws not_found for an unknown order", () => {
      expect(() => createService().detail("SO-9999")).toThrowError(
        expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
      );
    });
  });

  describe("create", () => {
    it("assigns the next code, defaults to draft and computes lines + summary", () => {
      const service = createService();
      const order = service.create({
        customerCode: "CUS-0001",
        items: [
          { product: "PRD-0001", name: "Alderwood standing desk", qty: 2, rate: 1450 },
          { product: "PRD-0002", name: "Aria ergonomic chair", qty: 3, rate: 620 },
        ],
      });

      expect(order.code).toBe("SO-2054");
      expect(order.status).toBe("draft");
      expect(order.customer).toEqual({ code: "CUS-0001", name: "Serenity Interiors" });
      expect(order.currency).toBe("USD");
      expect(order.deliveryDate).toBeNull();
      expect(order.items.map((item) => item.amount)).toEqual([2900, 1860]);
      expect(order.items[0].lineNo).toBe(1);
      expect(order.summary.subtotal).toBe(4760);
      expect(order.summary.total).toBe(4760);
      expect(service.detail("SO-2054").code).toBe("SO-2054");
    });

    it("throws not_found when the customer is unknown", () => {
      const service = createService();
      expect(() =>
        service.create({ customerCode: "CUS-9999", items: [{ product: "PRD-0001", qty: 1, rate: 10 }] }),
      ).toThrowError(expect.objectContaining({ code: ErrorCode.NOT_FOUND }));
    });
  });

  describe("update / changeStatus", () => {
    it("updates scalar fields and refreshes updatedAt", () => {
      const service = createService();
      const order = service.update("SO-2051", { notes: "Hold for approval" });

      expect(order.notes).toBe("Hold for approval");
      expect(order.updatedAt >= order.createdAt).toBe(true);
    });

    it("recomputes summary when items change", () => {
      const service = createService();
      const order = service.update("SO-2051", {
        items: [{ product: "PRD-0005", name: "Boardroom conference table", qty: 1, rate: 2200 }],
      });

      expect(order.items.length).toBe(1);
      expect(order.summary.total).toBe(2200);
    });

    it("changeStatus sets the status", () => {
      const service = createService();
      const order = service.changeStatus("SO-2051", { status: "submitted" });

      expect(order.status).toBe("submitted");
    });

    it("throws not_found when the order does not exist", () => {
      expect(() => createService().update("SO-9999", { notes: "x" })).toThrowError(
        expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
      );
    });
  });

  describe("remove", () => {
    it("removes the order", () => {
      const service = createService();
      service.remove("SO-2048");

      expect(service.list({ page: 1, pageSize: 100 }).meta.total).toBe(13);
    });

    it("throws not_found for an unknown order", () => {
      expect(() => createService().remove("SO-9999")).toThrowError(ApiException);
    });
  });

  describe("seed coherence", () => {
    it("covers every sales order status", () => {
      const items = all(createService());
      const statuses = new Set(items.map((order) => order.status));

      expect(statuses).toEqual(new Set([
        "draft",
        "submitted",
        "partially_delivered",
        "delivered",
        "completed",
        "cancelled",
      ]));
    });
  });
});
