import { describe, expect, it } from "vitest";
import { ErrorCode } from "@amni/shared";

import { CrmContactsService } from "./contacts.service";
import { ApiException } from "../common/api.exception";

describe("CrmContactsService", () => {
  const createService = () => new CrmContactsService();

  describe("list", () => {
    it("returns all contacts by default", () => {
      const result = createService().list({ page: 1, pageSize: 20 });

      expect(result.meta.total).toBe(10);
    });

    it("searches across name, email and company", () => {
      const result = createService().list({ page: 1, pageSize: 20, q: "meridian" });

      expect(result.meta.total).toBe(1);
      expect(result.items[0].code).toBe("CC-0004");
    });

    it("filters by organization", () => {
      const result = createService().list({ page: 1, pageSize: 20, organizationCode: "ORG-0001" });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].code).toBe("CC-0001");
    });

    it("sorts by a whitelisted field", () => {
      const result = createService().list({ page: 1, pageSize: 20, sortBy: "firstName", sortDir: "asc" });

      const [first, second] = result.items;
      expect(first.firstName.localeCompare(second.firstName)).toBeLessThanOrEqual(0);
    });

    it("paginates", () => {
      const service = createService();
      const page1 = service.list({ page: 1, pageSize: 4 });
      const page2 = service.list({ page: 2, pageSize: 4 });

      expect(page1.items).toHaveLength(4);
      expect(page2.items).toHaveLength(4);
      expect(page1.items[0].code).not.toBe(page2.items[0].code);
    });
  });

  describe("byCode / detail", () => {
    it("returns the contact for a known code", () => {
      const contact = createService().detail("CC-0001");

      expect(contact.firstName).toBe("Maya");
      expect(contact.company).toBe("Serenity Interiors");
    });

    it("throws NOT_FOUND for an unknown code", () => {
      expect(() => createService().byCode("CC-9999")).toThrowError(
        expect.objectContaining({ status: 404, code: ErrorCode.NOT_FOUND }),
      );
    });
  });

  describe("create", () => {
    it("allocates the next sequential code and defaults isPrimary to false", () => {
      const service = createService();
      const contact = service.create({ firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" });

      expect(contact.code).toBe("CC-0011");
      expect(contact.isPrimary).toBe(false);
      expect(contact.createdAt).toBeDefined();
    });
  });

  describe("update", () => {
    it("updates provided fields only", () => {
      const service = createService();
      const updated = service.update("CC-0001", { jobTitle: "Head of Facilities" });

      expect(updated.jobTitle).toBe("Head of Facilities");
      expect(updated.firstName).toBe("Maya");
      expect(updated.updatedAt).toBeDefined();
    });

    it("throws NOT_FOUND for an unknown code", () => {
      expect(() => createService().update("CC-9999", { firstName: "X" })).toThrow(ApiException);
    });
  });

  describe("remove", () => {
    it("removes a known contact and throws for an unknown one", () => {
      const service = createService();
      service.remove("CC-0001");

      expect(service.list({ page: 1, pageSize: 20 }).meta.total).toBe(9);
      expect(() => service.remove("CC-0001")).toThrow(ApiException);
    });
  });
});
