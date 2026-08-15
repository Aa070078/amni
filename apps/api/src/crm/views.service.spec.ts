import { describe, expect, it } from "vitest";
import { ErrorCode } from "@amni/shared";

import { CrmViewsService } from "./views.service";
import { ApiException } from "../common/api.exception";

describe("CrmViewsService", () => {
  const createService = () => new CrmViewsService();

  describe("list", () => {
    it("returns all views by default", () => {
      const result = createService().list({});

      expect(result.items).toHaveLength(9);
    });

    it("filters by doctype", () => {
      const result = createService().list({ doctype: "deal" });

      expect(result.items).toHaveLength(3);
      expect(result.items.every((view) => view.doctype === "deal")).toBe(true);
    });

    it("sorts newest first", () => {
      const items = createService().list({}).items;

      expect(items[0].id).toBe("view-9");
      expect(items[items.length - 1].id).toBe("view-1");
    });
  });

  describe("create", () => {
    it("creates a view with sensible defaults", () => {
      const service = createService();
      const view = service.create({ doctype: "contact", name: "Hot prospects" });

      expect(view.id).toMatch(/^view-/);
      expect(view.type).toBe("list");
      expect(view.isDefault).toBe(false);
      expect(view.pinned).toBe(false);
    });

    it("clears the previous default for the same doctype and type", () => {
      const service = createService();
      const view = service.create({ doctype: "deal", type: "kanban", name: "Q3 pipeline", isDefault: true });

      expect(view.isDefault).toBe(true);
      const deals = service.list({ doctype: "deal" }).items.filter((item) => item.type === "kanban");
      expect(deals.filter((item) => item.isDefault)).toHaveLength(1);
    });
  });

  describe("update", () => {
    it("promotes a view to default and demotes its siblings", () => {
      const service = createService();
      const updated = service.update("view-3", { isDefault: true });

      expect(updated.isDefault).toBe(true);
      const deals = service.list({ doctype: "deal" }).items.filter((item) => item.type === "list");
      expect(deals.filter((item) => item.isDefault)).toHaveLength(1);
      expect(deals.find((item) => item.id === "view-2")?.isDefault).toBe(false);
    });

    it("throws NOT_FOUND for an unknown id", () => {
      expect(() => createService().update("view-999", { name: "X" })).toThrowError(
        expect.objectContaining({ status: 404, code: ErrorCode.NOT_FOUND }),
      );
    });
  });

  describe("remove", () => {
    it("removes a known view and throws for an unknown one", () => {
      const service = createService();
      service.remove("view-9");

      expect(service.list({}).items).toHaveLength(8);
      expect(() => service.remove("view-9")).toThrow(ApiException);
    });
  });
});
