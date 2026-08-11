import { describe, expect, it } from "vitest";
import { ErrorCode } from "@amni/shared";

import { DealsService } from "./deals.service";
import { ApiException } from "../common/api.exception";

describe("DealsService", () => {
  const createService = () => new DealsService();

  describe("pipeline", () => {
    it("returns stats for every stage in canonical order", () => {
      const result = createService().pipeline({});

      expect(result.stats.map((stat) => stat.stage)).toEqual([
        "qualification",
        "analysis",
        "proposal",
        "negotiation",
        "won",
        "lost",
      ]);
      expect(result.stats.reduce((sum, stat) => sum + stat.count, 0)).toBe(result.items.length);
    });

    it("filters the pipeline by search across title and company", () => {
      const result = createService().pipeline({ q: "serenity" });

      expect(result.items.length).toBe(1);
      expect(result.items[0].code).toBe("DL-0001");
    });

    it("sums stage value from filtered items only", () => {
      const result = createService().pipeline({ q: "lumina" });

      expect(result.items.length).toBe(1);
      const proposal = result.stats.find((stat) => stat.stage === "proposal");
      expect(proposal?.value).toBe(47_000);
    });
  });

  describe("list", () => {
    it("returns the first page sorted by createdAt desc by default", () => {
      const result = createService().list({ page: 1, pageSize: 20 });

      expect(result.meta.total).toBe(10);
      expect(result.items[0].code).toBe("DL-0006");
    });

    it("honors whitelisted sortBy and sortDir", () => {
      const service = createService();
      const result = service.list({ page: 1, pageSize: 20, sortBy: "value", sortDir: "desc" });

      const [first, second] = result.items;
      expect(first.value).toBeGreaterThanOrEqual(second.value);
    });

    it("falls back to createdAt when sortBy is not whitelisted", () => {
      const result = createService().list({ page: 1, pageSize: 20, sortBy: "notes", sortDir: "asc" });

      expect(result.items[0].code).toBe("DL-0004");
    });

    it("filters by stage", () => {
      const result = createService().list({ page: 1, pageSize: 20, stage: "won" });

      expect(result.items.every((deal) => deal.stage === "won")).toBe(true);
      expect(result.meta.total).toBe(2);
    });

    it("searches case-insensitively", () => {
      const result = createService().list({ page: 1, pageSize: 20, q: "MERIDIAN" });

      expect(result.meta.total).toBe(1);
      expect(result.items[0].code).toBe("DL-0004");
    });

    it("paginates", () => {
      const service = createService();
      const page1 = service.list({ page: 1, pageSize: 6 });
      const page2 = service.list({ page: 2, pageSize: 6 });

      expect(page1.items.length).toBe(6);
      expect(page2.items.length).toBe(4);
      expect(page2.items[0]).not.toBe(page1.items[0]);
    });
  });

  describe("detail", () => {
    it("returns the deal with derived activities", () => {
      const detail = createService().detail("DL-0004");

      expect(detail.code).toBe("DL-0004");
      expect(detail.probability).toBe(100);
      expect(detail.activities.length).toBeGreaterThanOrEqual(3);
      expect(detail.activities.some((activity) => activity.action === "Won deal")).toBe(true);
    });

    it("throws not_found for an unknown deal", () => {
      expect(() => createService().detail("DL-9999")).toThrowError(
        expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
      );
    });
  });

  describe("create", () => {
    it("assigns the next code, defaults stage to qualification and derives probability", () => {
      const service = createService();
      const deal = service.create({
        title: "Test deal",
        company: "Test Co",
        contactName: "Jane Doe",
        contactEmail: "jane@testco.com",
        value: 10_000,
      });

      expect(deal.code).toBe("DL-0011");
      expect(deal.stage).toBe("qualification");
      expect(deal.probability).toBe(15);
      expect(deal.currency).toBe("USD");
      expect(service.detail("DL-0011").company).toBe("Test Co");
    });

    it("honors explicit stage and source", () => {
      const service = createService();
      const deal = service.create({
        title: "Test deal",
        company: "Test Co",
        contactName: "Jane Doe",
        contactEmail: "jane@testco.com",
        value: 5_000,
        stage: "negotiation",
        source: "referral",
      });

      expect(deal.probability).toBe(80);
      expect(deal.source).toBe("referral");
    });
  });

  describe("update / moveStage", () => {
    it("updates scalar fields and refreshes updatedAt", () => {
      const service = createService();
      const deal = service.update("DL-0003", { value: 21_000, owner: "Theo Lindqvist" });

      expect(deal.value).toBe(21_000);
      expect(deal.owner).toBe("Theo Lindqvist");
      expect(deal.updatedAt >= deal.createdAt).toBe(true);
    });

    it("moveStage recomputes probability", () => {
      const service = createService();
      const moved = service.moveStage("DL-0003", { stage: "won" });

      expect(moved.stage).toBe("won");
      expect(moved.probability).toBe(100);
    });

    it("throws not_found when the deal does not exist", () => {
      const service = createService();
      expect(() => service.update("DL-9999", { value: 1 })).toThrowError(
        expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
      );
    });
  });

  describe("remove", () => {
    it("removes the deal", () => {
      const service = createService();
      service.remove("DL-0010");

      expect(service.list({ page: 1, pageSize: 20 }).meta.total).toBe(9);
    });

    it("throws not_found for an unknown deal", () => {
      const service = createService();
      expect(() => service.remove("DL-9999")).toThrowError(ApiException);
    });
  });
});
