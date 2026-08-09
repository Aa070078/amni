import { describe, expect, it } from "vitest";
import { ErrorCode } from "@amni/shared";

import { ContactsService } from "./contacts.service";
import { ApiException } from "../common/api.exception";

describe("ContactsService", () => {
  const createService = () => new ContactsService();

  describe("list", () => {
    it("returns the first page sorted by createdAt desc by default", () => {
      const result = createService().list({ page: 1, pageSize: 20 });

      expect(result.meta.total).toBe(10);
      expect(result.items[0].code).toBe("CON-0010");
    });

    it("sorts by company ascending when requested", () => {
      const result = createService().list({ page: 1, pageSize: 20, sortBy: "company", sortDir: "asc" });

      expect(result.items[0].code).toBe("CON-0009");
    });

    it("filters by status", () => {
      const result = createService().list({ page: 1, pageSize: 20, status: "inactive" });

      expect(result.items.every((contact) => contact.status === "inactive")).toBe(true);
      expect(result.meta.total).toBe(1);
    });

    it("searches case-insensitively across name, title and company", () => {
      const result = createService().list({ page: 1, pageSize: 20, q: "sales" });

      expect(result.meta.total).toBe(1);
      expect(result.items[0].code).toBe("CON-0002");
    });

    it("paginates", () => {
      const service = createService();
      const page1 = service.list({ page: 1, pageSize: 4 });
      const page2 = service.list({ page: 2, pageSize: 4 });

      expect(page1.items.length).toBe(4);
      expect(page2.items.length).toBe(4);
      expect(page2.items[0]).not.toBe(page1.items[0]);
    });
  });

  describe("detail", () => {
    it("returns the contact with all fields", () => {
      const detail = createService().detail("CON-0001");

      expect(detail.code).toBe("CON-0001");
      expect(detail.firstName).toBe("Amira");
      expect(detail.company).toBe("Demo Co");
      expect(detail.status).toBe("active");
    });

    it("throws not_found for an unknown contact", () => {
      expect(() => createService().detail("CON-9999")).toThrowError(
        expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
      );
    });
  });

  describe("create", () => {
    it("assigns the next code and applies schema defaults", () => {
      const service = createService();
      const contact = service.create({ firstName: "Tariq", lastName: "Ali" });

      expect(contact.code).toBe("CON-0011");
      expect(contact.status).toBe("active");
      expect(contact.firstName).toBe("Tariq");
      expect(service.detail("CON-0011").lastName).toBe("Ali");
    });
  });

  describe("update", () => {
    it("updates scalar fields and refreshes updatedAt", () => {
      const service = createService();
      const contact = service.update("CON-0002", { department: "Revenue", jobTitle: "VP Sales" });

      expect(contact.department).toBe("Revenue");
      expect(contact.jobTitle).toBe("VP Sales");
      expect(contact.updatedAt >= contact.createdAt).toBe(true);
    });

    it("throws not_found when the contact does not exist", () => {
      const service = createService();
      expect(() => service.update("CON-9999", { firstName: "X" })).toThrowError(
        expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
      );
    });
  });

  describe("remove", () => {
    it("removes the contact", () => {
      const service = createService();
      service.remove("CON-0010");

      expect(service.list({ page: 1, pageSize: 20 }).meta.total).toBe(9);
    });

    it("throws not_found for an unknown contact", () => {
      const service = createService();
      expect(() => service.remove("CON-9999")).toThrowError(ApiException);
    });
  });
});
