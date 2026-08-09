import { describe, expect, it } from "vitest";
import { ErrorCode } from "@amni/shared";

import { EquityService } from "./equity.service";
import { ApiException } from "../common/api.exception";

describe("EquityService", () => {
  const createService = () => new EquityService();

  describe("overview", () => {
    it("derives totals from shareholders and the latest closed round", () => {
      const overview = createService().overview();

      expect(overview.totalShares).toBe(50000);
      expect(overview.totalInvested).toBe(215000);
      expect(overview.currentValuation).toBe(1100000);
      expect(overview.investorCount).toBe(1);
      expect(overview.optionPoolPct).toBe(4);
      expect(overview.byClass.length).toBe(3);
    });
  });

  describe("shareholders", () => {
    it("lists seeded shareholders and filters by type", () => {
      const result = createService().listShareholders({ page: 1, pageSize: 20, type: "founder" });

      expect(result.meta.total).toBe(2);
    });

    it("creates a shareholder totalling its holdings", () => {
      const service = createService();
      const shareholder = service.createShareholder({
        name: "Brightline Media",
        type: "investor",
        holdings: [{ classCode: "CLS-0002", shares: 1200 }],
        investedAmount: 30000,
      });

      expect(shareholder.code).toBe("SH-0005");
      expect(shareholder.totalShares).toBe(1200);
    });

    it("updates holdings and recomputes the total", () => {
      const service = createService();
      const shareholder = service.updateShareholder("SH-0004", {
        holdings: [{ classCode: "CLS-0003", shares: 2500 }],
      });

      expect(shareholder.totalShares).toBe(2500);
    });

    it("throws not_found for unknown shareholders", () => {
      expect(() => createService().detailShareholder("SH-9999")).toThrowError(
        expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
      );
    });

    it("removes a shareholder", () => {
      const service = createService();
      service.removeShareholder("SH-0004");

      expect(service.listShareholders({ page: 1, pageSize: 20 }).meta.total).toBe(3);
    });
  });

  describe("share classes", () => {
    it("lists classes and creates with the next code", () => {
      const service = createService();
      const entry = service.createClass({ name: "Series A preferred", totalShares: 5000, outstandingShares: 5000, pricePerShare: 40 });

      expect(entry.code).toBe("CLS-0004");
      expect(entry.status).toBe("active");
    });

    it("changes status and throws not_found", () => {
      const service = createService();

      expect(service.changeClassStatus("CLS-0003", { status: "archived" }).status).toBe("archived");
      expect(() => service.detailClass("CLS-9999")).toThrowError(ApiException);

      service.removeClass("CLS-0003");
      expect(service.listClasses({ page: 1, pageSize: 20 }).meta.total).toBe(2);
    });
  });

  describe("rounds", () => {
    it("lists rounds and filters by status", () => {
      const result = createService().listRounds({ page: 1, pageSize: 20, status: "closed" });

      expect(result.meta.total).toBe(1);
      expect(result.items[0].code).toBe("RD-0001");
    });

    it("creates a round defaulting status from closedDate", () => {
      const service = createService();
      const round = service.createRound({
        name: "Bridge note",
        type: "note",
        amountRaised: 50000,
        preMoney: 0,
        postMoney: 0,
        sharesIssued: 0,
        investors: ["Angel Syndicate"],
      });

      expect(round.code).toBe("RD-0003");
      expect(round.status).toBe("announced");
      expect(round.valuation).toBe(0);
    });

    it("marks a round closed and stamps closedDate", () => {
      const service = createService();
      const round = service.changeRoundStatus("RD-0002", { status: "closed" });

      expect(round.status).toBe("closed");
      expect(round.closedDate).toBeDefined();
    });

    it("throws not_found for unknown rounds", () => {
      expect(() => createService().detailRound("RD-9999")).toThrowError(
        expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
      );
    });

    it("removes a round", () => {
      const service = createService();
      service.removeRound("RD-0002");

      expect(service.listRounds({ page: 1, pageSize: 20 }).meta.total).toBe(1);
    });
  });

  describe("cap table", () => {
    it("flattens holdings with class names and ownership percentages", () => {
      const rows = createService().capTable();

      expect(rows.length).toBe(4);
      expect(rows[0].shares).toBe(25000);
      expect(rows[0].ownershipPct).toBe(50);
      expect(rows[0].className).toBe("Common stock");
      const totalPct = rows.reduce((sum, row) => sum + row.ownershipPct, 0);
      expect(Math.round(totalPct)).toBe(100);
    });
  });
});
