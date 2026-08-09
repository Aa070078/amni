import { describe, expect, it } from "vitest";

import { SearchService } from "./search.service";

describe("SearchService", () => {
  const createService = () => new SearchService();

  describe("global", () => {
    it("groups results by type with stable labels", () => {
      const result = createService().global({ q: "serenity" });

      expect(result.query).toBe("serenity");
      expect(result.groups.length).toBeGreaterThan(0);
      const customers = result.groups.find((group) => group.label === "Customers");
      expect(customers?.results[0]?.title).toBe("Serenity Interiors");
    });

    it("matches across codes, titles and metadata", () => {
      const byCode = createService().global({ q: "SO-2040" });
      const byMeta = createService().global({ q: "5,380" });

      expect(byCode.groups.flatMap((group) => group.results).some((result) => result.type === "sales_order")).toBe(true);
      expect(byMeta.groups.flatMap((group) => group.results).some((result) => result.type === "sales_order")).toBe(true);
    });

    it("is case-insensitive", () => {
      const result = createService().global({ q: "NIMBUS" });

      expect(result.groups.flatMap((group) => group.results).some((result) => result.id === "product-prd-0001")).toBe(true);
    });

    it("returns empty groups for no matches", () => {
      const result = createService().global({ q: "zzzz-no-such-term" });

      expect(result.groups).toEqual([]);
    });
  });
});
