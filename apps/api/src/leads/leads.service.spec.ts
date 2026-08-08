import { describe, expect, it } from "vitest";
import { ErrorCode } from "@amni/shared";

import { LeadsService } from "./leads.service";
import { ApiException } from "../common/api.exception";

describe("LeadsService", () => {
  const createService = () => new LeadsService();

  describe("pipeline", () => {
    it("returns stats for every stage in canonical order", () => {
      const result = createService().pipeline({});

      expect(result.stats.map((stat) => stat.stage)).toEqual([
        "new",
        "contacted",
        "qualified",
        "proposal",
        "won",
        "lost",
      ]);
      expect(result.stats.reduce((sum, stat) => sum + stat.count, 0)).toBe(result.items.length);
    });

    it("filters the pipeline by search across company and contact", () => {
      const result = createService().pipeline({ q: "serenity" });

      expect(result.items.length).toBe(1);
      expect(result.items[0].code).toBe("LD-0001");
    });

    it("sums stage value from filtered items only", () => {
      const result = createService().pipeline({ q: "lumina" });

      expect(result.items.length).toBe(1);
      const qualified = result.stats.find((stat) => stat.stage === "qualified");
      expect(qualified?.value).toBe(23_500);
    });
  });

  describe("list", () => {
    it("returns the first page sorted by createdAt desc by default", () => {
      const result = createService().list({ page: 1, pageSize: 20 });

      expect(result.meta.total).toBe(20);
      expect(result.items[0].code).toBe("LD-0020");
    });

    it("honors whitelisted sortBy and sortDir", () => {
      const service = createService();
      const result = service.list({ page: 1, pageSize: 20, sortBy: "value", sortDir: "desc" });

      const [first, second] = result.items;
      expect(first.value).toBeGreaterThanOrEqual(second.value);
    });

    it("falls back to createdAt when sortBy is not whitelisted", () => {
      const result = createService().list({ page: 1, pageSize: 20, sortBy: "notes", sortDir: "asc" });

      expect(result.items[0].code).toBe("LD-0019");
    });

    it("filters by stage", () => {
      const result = createService().list({ page: 1, pageSize: 20, stage: "won" });

      expect(result.items.every((lead) => lead.stage === "won")).toBe(true);
      expect(result.meta.total).toBe(3);
    });

    it("searches case-insensitively", () => {
      const result = createService().list({ page: 1, pageSize: 20, q: "MAYA" });

      expect(result.meta.total).toBe(1);
      expect(result.items[0].code).toBe("LD-0001");
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
    it("returns the lead with derived activities", () => {
      const detail = createService().detail("LD-0006");

      expect(detail.code).toBe("LD-0006");
      expect(detail.probability).toBe(100);
      expect(detail.activities.length).toBeGreaterThanOrEqual(3);
      expect(detail.activities.some((activity) => activity.action === "Won deal")).toBe(true);
    });

    it("throws not_found for an unknown lead", () => {
      expect(() => createService().detail("LD-9999")).toThrowError(
        expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
      );
    });
  });

  describe("create", () => {
    it("assigns the next code, defaults stage to new and derives probability", () => {
      const service = createService();
      const lead = service.create({
        company: "Test Co",
        contactName: "Jane Doe",
        contactEmail: "jane@testco.com",
        value: 10_000,
      });

      expect(lead.code).toBe("LD-0021");
      expect(lead.stage).toBe("new");
      expect(lead.probability).toBe(10);
      expect(lead.currency).toBe("USD");
      expect(service.detail("LD-0021").company).toBe("Test Co");
    });

    it("honors explicit stage and source", () => {
      const service = createService();
      const lead = service.create({
        company: "Test Co",
        contactName: "Jane Doe",
        contactEmail: "jane@testco.com",
        value: 5_000,
        stage: "proposal",
        source: "referral",
      });

      expect(lead.probability).toBe(70);
      expect(lead.source).toBe("referral");
    });
  });

  describe("update / moveStage", () => {
    it("updates scalar fields and refreshes updatedAt", () => {
      const service = createService();
      const lead = service.update("LD-0003", { value: 14_000, owner: "Theo Lindqvist" });

      expect(lead.value).toBe(14_000);
      expect(lead.owner).toBe("Theo Lindqvist");
      expect(lead.updatedAt >= lead.createdAt).toBe(true);
    });

    it("moveStage recomputes probability", () => {
      const service = createService();
      const moved = service.moveStage("LD-0003", { stage: "won" });

      expect(moved.stage).toBe("won");
      expect(moved.probability).toBe(100);
    });

    it("throws not_found when the lead does not exist", () => {
      const service = createService();
      expect(() => service.update("LD-9999", { value: 1 })).toThrowError(
        expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
      );
    });
  });

  describe("remove", () => {
    it("removes the lead", () => {
      const service = createService();
      service.remove("LD-0010");

      expect(service.list({ page: 1, pageSize: 20 }).meta.total).toBe(19);
    });

    it("throws not_found for an unknown lead", () => {
      const service = createService();
      expect(() => service.remove("LD-9999")).toThrowError(ApiException);
    });
  });
});
