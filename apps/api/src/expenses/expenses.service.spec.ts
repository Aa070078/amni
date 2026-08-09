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
});
