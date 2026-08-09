import { describe, expect, it } from "vitest";
import { ErrorCode } from "@amni/shared";

import { EsgService } from "./esg.service";

describe("EsgService", () => {
  const createService = () => new EsgService();

  describe("overview", () => {
    it("returns scores, KPIs and the latest published report", () => {
      const overview = createService().overview();

      expect(overview.scores.overall).toBe(79);
      expect(overview.carbonFootprint).toBe(182);
      expect(overview.employees).toBe(64);
      expect(overview.boardSize).toBe(4);
      expect(overview.policiesActive).toBe(2);
      expect(overview.latestReport?.code).toBe("ESG-0001");
      expect(overview.kpis.length).toBe(4);
    });
  });

  describe("metrics", () => {
    it("filters by pillar and status", () => {
      const service = createService();

      const environmental = service.listMetrics({ pillar: "environmental" });
      expect(environmental.length).toBe(3);

      const behind = service.listMetrics({ status: "behind" });
      expect(behind.length).toBe(1);
      expect(behind[0].code).toBe("ESG-M02");
    });

    it("returns detail and throws not_found", () => {
      const service = createService();

      expect(service.metricDetail("ESG-M01").unit).toBe("tCO2e");
      expect(() => service.metricDetail("ESG-M99")).toThrowError(
        expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
      );
    });
  });

  describe("policies and board", () => {
    it("lists policies and board members", () => {
      const service = createService();

      expect(service.listPolicies().length).toBe(4);
      expect(service.listBoard().length).toBe(4);
      expect(service.listBoard()[2].independence).toBe("independent");
    });

    it("throws not_found for unknown policy codes", () => {
      expect(() => createService().policyDetail("POL-9999")).toThrowError(
        expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
      );
    });
  });

  describe("reports", () => {
    it("lists reports newest first and returns detail", () => {
      const service = createService();
      const reports = service.listReports();

      expect(reports.length).toBe(2);
      expect(reports[0].code).toBe("ESG-0002");
      expect(service.reportDetail("ESG-0001").status).toBe("published");
      expect(() => service.reportDetail("ESG-9999")).toThrowError(
        expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
      );
    });
  });
});
