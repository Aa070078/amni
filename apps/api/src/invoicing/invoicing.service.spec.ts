import { describe, expect, it } from "vitest";
import { ErrorCode } from "@amni/shared";

import { InvoicingService } from "./invoicing.service";
import { ApiException } from "../common/api.exception";

describe("InvoicingService", () => {
  const createService = () => new InvoicingService();

  describe("overview", () => {
    it("computes outstanding credit notes from issued records and active recurring count", () => {
      const overview = createService().overview();

      expect(overview.creditNotesOutstanding).toBe(255);
      expect(overview.recurringActive).toBe(3);
      expect(overview.kpis.length).toBe(4);
      expect(overview.dueSoonBills.length).toBeGreaterThan(0);
    });
  });

  describe("credit notes", () => {
    it("lists seeded credit notes sorted by createdAt desc", () => {
      const result = createService().listCreditNotes({ page: 1, pageSize: 20 });

      expect(result.meta.total).toBe(4);
      expect(result.items[0].code).toBe("CRN-0004");
    });

    it("filters by status and searches", () => {
      const service = createService();
      const issued = service.listCreditNotes({ page: 1, pageSize: 20, status: "issued" });

      expect(issued.meta.total).toBe(1);
      expect(issued.items[0].code).toBe("CRN-0003");

      const found = service.listCreditNotes({ page: 1, pageSize: 20, q: "LUMINA" });
      expect(found.meta.total).toBe(1);
      expect(found.items[0].code).toBe("CRN-0002");
    });

    it("returns detail and throws not_found for unknown codes", () => {
      const service = createService();

      expect(service.detailCreditNote("CRN-0001").status).toBe("applied");
      expect(() => service.detailCreditNote("CRN-9999")).toThrowError(
        expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
      );
    });

    it("creates a credit note with next code, computed lines and draft status", () => {
      const service = createService();
      const note = service.createCreditNote({
        invoiceCode: "INV-0005",
        reason: "RMA credit",
        items: [{ product: "PRD-0002", name: "Aria ergonomic chair", qty: 2, rate: 620 }],
      });

      expect(note.code).toBe("CRN-0005");
      expect(note.status).toBe("draft");
      expect(note.customer.name).toBe("Atlas Facilities");
      expect(note.items[0].amount).toBe(1240);
      expect(note.summary.total).toBe(1240);
    });

    it("updates fields and refreshes updatedAt", () => {
      const service = createService();
      const note = service.updateCreditNote("CRN-0004", { reason: "Approved for return" });

      expect(note.reason).toBe("Approved for return");
      expect(note.updatedAt >= note.createdAt).toBe(true);
    });

    it("changes status and removes", () => {
      const service = createService();

      expect(service.changeCreditNoteStatus("CRN-0004", { status: "void" }).status).toBe("void");

      service.removeCreditNote("CRN-0004");
      expect(service.listCreditNotes({ page: 1, pageSize: 20 }).meta.total).toBe(3);
      expect(() => service.removeCreditNote("CRN-9999")).toThrowError(ApiException);
    });
  });

  describe("recurring", () => {
    it("lists seeded recurring profiles and filters by status", () => {
      const service = createService();
      const result = service.listRecurring({ page: 1, pageSize: 20, status: "paused" });

      expect(result.meta.total).toBe(1);
      expect(result.items[0].code).toBe("RINV-0004");
    });

    it("creates a profile with next code and defaults", () => {
      const service = createService();
      const profile = service.createRecurring({
        customerCode: "CUS-0001",
        name: "Monthly support retainer",
        interval: "monthly",
        items: [{ product: "SVC-010", name: "Support retainer", qty: 1, rate: 800 }],
      });

      expect(profile.code).toBe("RINV-0005");
      expect(profile.status).toBe("active");
      expect(profile.customer.name).toBe("Serenity Interiors");
      expect(profile.summary.total).toBe(800);
    });

    it("updates, changes status and throws not_found", () => {
      const service = createService();

      expect(service.updateRecurring("RINV-0001", { dayOfPeriod: 15 }).dayOfPeriod).toBe(15);
      expect(service.changeRecurringStatus("RINV-0001", { status: "paused" }).status).toBe("paused");
      expect(() => service.detailRecurring("RINV-9999")).toThrowError(
        expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
      );

      service.removeRecurring("RINV-0004");
      expect(service.listRecurring({ page: 1, pageSize: 20 }).meta.total).toBe(3);
    });
  });
});
