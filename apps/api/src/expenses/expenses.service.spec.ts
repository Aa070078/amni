import { describe, expect, it } from "vitest";
import { ErrorCode } from "@amni/shared";

import { ExpensesService } from "./expenses.service";
import { ApiException } from "../common/api.exception";

describe("ExpensesService", () => {
  const createService = () => new ExpensesService();

  describe("list", () => {
    it("returns the first page sorted by createdAt desc by default", () => {
      const result = createService().list({ page: 1, pageSize: 20 });

      expect(result.meta.total).toBe(8);
      expect(result.items[0].code).toBe("EXP-0008");
    });

    it("filters by category", () => {
      const result = createService().list({ page: 1, pageSize: 20, category: "travel" });

      expect(result.items.every((expense) => expense.category === "travel")).toBe(true);
      expect(result.meta.total).toBe(1);
    });

    it("filters by status", () => {
      const result = createService().list({ page: 1, pageSize: 20, status: "paid" });

      expect(result.items.every((expense) => expense.status === "paid")).toBe(true);
      expect(result.meta.total).toBe(3);
    });

    it("searches case-insensitively across description", () => {
      const result = createService().list({ page: 1, pageSize: 20, q: "stationery" });

      expect(result.meta.total).toBe(1);
      expect(result.items[0].code).toBe("EXP-0006");
    });
  });

  describe("detail", () => {
    it("returns the expense with all fields", () => {
      const detail = createService().detail("EXP-0001");

      expect(detail.code).toBe("EXP-0001");
      expect(detail.category).toBe("rent");
      expect(detail.amount).toBe(4200);
      expect(detail.status).toBe("paid");
    });

    it("throws not_found for an unknown expense", () => {
      expect(() => createService().detail("EXP-9999")).toThrowError(
        expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
      );
    });
  });

  describe("create", () => {
    it("assigns the next code and applies defaults", () => {
      const service = createService();
      const expense = service.create({
        category: "software",
        description: "New project tool",
        amount: 89,
      });

      expect(expense.code).toBe("EXP-0009");
      expect(expense.status).toBe("draft");
      expect(expense.currency).toBe("USD");
      expect(expense.vat).toBe(0);
      expect(service.detail("EXP-0009").description).toBe("New project tool");
    });
  });

  describe("changeStatus", () => {
    it("updates the status", () => {
      const service = createService();
      const expense = service.changeStatus("EXP-0006", { status: "approved" });

      expect(expense.status).toBe("approved");
    });

    it("throws not_found when the expense does not exist", () => {
      const service = createService();
      expect(() => service.changeStatus("EXP-9999", { status: "approved" })).toThrowError(
        expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
      );
    });
  });

  describe("remove", () => {
    it("removes the expense", () => {
      const service = createService();
      service.remove("EXP-0008");

      expect(service.list({ page: 1, pageSize: 20 }).meta.total).toBe(7);
    });

    it("throws not_found for an unknown expense", () => {
      const service = createService();
      expect(() => service.remove("EXP-9999")).toThrowError(ApiException);
    });
  });

  describe("overview", () => {
    it("computes KPIs and top categories from records", () => {
      const overview = createService().overview();

      expect(overview.kpis.length).toBe(4);
      expect(overview.topCategories.length).toBeGreaterThan(0);
      expect(overview.topCategories[0].amount).toBeGreaterThanOrEqual(overview.topCategories[1].amount);
    });
  });

  describe("claims", () => {
    it("lists seeded claims filtered by status", () => {
      const result = createService().listClaims({ page: 1, pageSize: 20, status: "paid" });

      expect(result.meta.total).toBe(1);
      expect(result.items[0].code).toBe("CLM-0003");
    });

    it("computes the total from items on create", () => {
      const service = createService();
      const claim = service.createClaim({
        employee: "Amara Osei",
        purpose: "Client dinner",
        items: [
          { description: "Dinner with client", category: "travel", date: new Date().toISOString(), amount: 120 },
          { description: "Taxi", category: "travel", date: new Date().toISOString(), amount: 40 },
        ],
      });

      expect(claim.code).toBe("CLM-0004");
      expect(claim.status).toBe("draft");
      expect(claim.total).toBe(160);
    });

    it("recomputes total when items change and stamps paidDate on paid", () => {
      const service = createService();
      const updated = service.updateClaim("CLM-0002", {
        items: [{ description: "Stationery restock", category: "office", date: new Date().toISOString(), amount: 300 }],
      });

      expect(updated.total).toBe(300);

      const paid = service.changeClaimStatus("CLM-0002", { status: "paid" });
      expect(paid.status).toBe("paid");
      expect(paid.paidDate).toBeDefined();
    });

    it("throws not_found for unknown claims", () => {
      expect(() => createService().detailClaim("CLM-9999")).toThrowError(
        expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
      );
    });

    it("removes a claim", () => {
      const service = createService();
      service.removeClaim("CLM-0003");

      expect(service.listClaims({ page: 1, pageSize: 20 }).meta.total).toBe(2);
    });
  });

  describe("categories", () => {
    it("lists seeded categories and filters by status", () => {
      const result = createService().listCategories({ page: 1, pageSize: 20, status: "archived" });

      expect(result.meta.total).toBe(1);
      expect(result.items[0].code).toBe("CAT-0009");
    });

    it("creates a category with the next code", () => {
      const service = createService();
      const category = service.createCategory({ name: "Training" });

      expect(category.code).toBe("CAT-0010");
      expect(category.status).toBe("active");
      expect(category.color).toBe("zinc");
    });

    it("updates, changes status and throws not_found", () => {
      const service = createService();

      expect(service.updateCategory("CAT-0001", { color: "indigo" }).color).toBe("indigo");
      expect(service.changeCategoryStatus("CAT-0001", { status: "archived" }).status).toBe("archived");
      expect(() => service.updateCategory("CAT-9999", { name: "x" })).toThrowError(ApiException);

      service.removeCategory("CAT-0009");
      expect(service.listCategories({ page: 1, pageSize: 20 }).meta.total).toBe(8);
    });
  });
});
