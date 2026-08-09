import { describe, expect, it } from "vitest";
import { FinanceService } from "./finance.service";

describe("FinanceService", () => {
  const createService = () => new FinanceService();

  describe("overview", () => {
    it("returns KPIs, trends, aging and monthly totals", () => {
      const overview = createService().overview();

      expect(overview.kpis.length).toBe(4);
      expect(overview.kpis.every((kpi) => kpi.format === "currency")).toBe(true);
      expect(overview.revenueTrend.length).toBe(12);
      expect(overview.arAging.length).toBe(5);
      expect(overview.apAging.length).toBe(5);
      expect(overview.monthlyTotals.length).toBe(12);
    });
  });

  describe("report", () => {
    it("returns an income statement with rows and total", () => {
      const report = createService().report("income_statement");

      expect(report.title).toBe("Income statement");
      expect(report.currency).toBe("USD");
      expect(report.rows.length).toBeGreaterThan(0);
      expect(report.total).toBe(report.rows.reduce((sum, row) => sum + row.amount, 0));
    });

    it("returns an AR aging report", () => {
      const report = createService().report("ar_aging");

      expect(report.title).toBe("Accounts receivable aging");
      expect(report.rows[report.rows.length - 1].account).toBe("Total receivables");
    });

    it("returns a balance sheet", () => {
      const report = createService().report("balance_sheet");

      expect(report.title).toBe("Balance sheet");
      expect(report.rows.some((row) => row.account === "Total assets")).toBe(true);
    });
  });
});
