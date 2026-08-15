import { describe, expect, it } from "vitest";
import { ErrorCode } from "@amni/shared";

import { CrmNotesService } from "./notes.service";
import { ApiException } from "../common/api.exception";

describe("CrmNotesService", () => {
  const createService = () => new CrmNotesService();

  describe("list", () => {
    it("returns all notes by default", () => {
      const result = createService().list({ page: 1, pageSize: 20 });

      expect(result.meta.total).toBe(6);
    });

    it("filters by pinned", () => {
      const service = createService();
      const pinned = service.list({ page: 1, pageSize: 20, pinned: "true" });

      expect(pinned.items.every((note) => note.pinned)).toBe(true);
      expect(pinned.meta.total).toBe(2);
    });

    it("filters by reference and searches content", () => {
      const service = createService();
      const byDeal = service.list({ page: 1, pageSize: 20, referenceType: "deal", referenceCode: "DL-0005" });
      const byTerm = service.list({ page: 1, pageSize: 20, q: "trade show" });

      expect(byDeal.items).toHaveLength(1);
      expect(byTerm.items[0].code).toBe("NTE-0004");
    });
  });

  describe("create", () => {
    it("creates a note with the supplied author and code", () => {
      const service = createService();
      const note = service.create({ title: "Standup", content: "Blocked on pricing.", author: "Amara Osei" });

      expect(note.code).toBe("NTE-0007");
      expect(note.author).toBe("Amara Osei");
      expect(note.pinned).toBe(false);
    });
  });

  describe("update", () => {
    it("updates provided fields only", () => {
      const service = createService();
      const updated = service.update("NTE-0001", { pinned: false });

      expect(updated.pinned).toBe(false);
      expect(updated.title).toBe("Serenity discovery call notes");
    });

    it("throws NOT_FOUND for an unknown code", () => {
      expect(() => createService().update("NTE-9999", { pinned: true })).toThrowError(
        expect.objectContaining({ status: 404, code: ErrorCode.NOT_FOUND }),
      );
    });
  });

  describe("listForReference", () => {
    it("returns notes linked to a record", () => {
      const notes = createService().listForReference("deal", "DL-0001");

      expect(notes).toHaveLength(1);
      expect(notes[0].code).toBe("NTE-0001");
    });
  });

  describe("remove", () => {
    it("removes a known note and throws for an unknown one", () => {
      const service = createService();
      service.remove("NTE-0006");

      expect(service.list({ page: 1, pageSize: 20 }).meta.total).toBe(5);
      expect(() => service.remove("NTE-0006")).toThrow(ApiException);
    });
  });
});
