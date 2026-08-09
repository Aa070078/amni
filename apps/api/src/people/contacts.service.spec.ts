import { describe, expect, it } from "vitest";
import { ErrorCode } from "@amni/shared";

import { ContactsService } from "./contacts.service";

describe("ContactsService", () => {
  const createService = () => new ContactsService();
  const baseQuery = {
    page: 1,
    pageSize: 20,
    sortBy: undefined,
    sortDir: "asc" as const,
    q: undefined,
    status: undefined,
    department: undefined,
  };

  describe("list", () => {
    it("returns the first page sorted by first name ascending by default", () => {
      const result = createService().list(baseQuery);

      expect(result.items.length).toBe(10);
      expect(result.meta.total).toBe(10);
      expect(result.items[0].firstName).toBe("Ahmed");
    });

    it("filters by status and department", () => {
      const service = createService();
      const active = service.list({ ...baseQuery, status: "active" });
      const procurement = service.list({ ...baseQuery, department: "Procurement" });

      expect(active.items.every((contact) => contact.status === "active")).toBe(true);
      expect(active.meta.total).toBe(9);
      expect(procurement.items.every((contact) => contact.department === "Procurement")).toBe(true);
      expect(procurement.meta.total).toBe(4);
    });

    it("searches across names, title and department case-insensitively", () => {
      const result = createService().list({ ...baseQuery, q: "accountant" });

      expect(result.meta.total).toBe(1);
      expect(result.items[0].id).toBe("CON-0005");
    });

    it("paginates", () => {
      const page2 = createService().list({ ...baseQuery, page: 2, pageSize: 4 });

      expect(page2.items.length).toBe(4);
      expect(page2.meta.page).toBe(2);
    });
  });

  describe("getById", () => {
    it("returns the contact detail", () => {
      const detail = createService().getById("CON-0001");

      expect(detail).toMatchObject({
        id: "CON-0001",
        firstName: "Sara",
        lastName: "Mahmoud",
        title: "Purchasing Manager",
      });
    });

    it("throws NOT_FOUND for an unknown id", () => {
      expect(() => createService().getById("CON-9999")).toThrowError(
        expect.objectContaining({ code: ErrorCode.NOT_FOUND }),
      );
    });
  });
});
