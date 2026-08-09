import { describe, expect, it } from "vitest";
import { contactDetailSchema, contactListQuerySchema, contactSummarySchema } from "./contact.js";

const summary = {
  id: "CON-0001",
  firstName: "Sara",
  lastName: "Mahmoud",
  email: "sara.mahmoud@amni.app",
  title: "Purchasing Manager",
  department: "Procurement",
  status: "active",
  createdAt: "2026-07-03T09:00:00.000Z",
};

describe("contact schemas", () => {
  it("parses a valid contact summary", () => {
    expect(contactSummarySchema.parse(summary)).toMatchObject({ firstName: "Sara", status: "active" });
  });

  it("rejects an unknown status", () => {
    expect(contactSummarySchema.safeParse({ ...summary, status: "left" }).success).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(contactSummarySchema.safeParse({ ...summary, email: "nope" }).success).toBe(false);
  });

  it("parses a valid detail with optional fields", () => {
    const detail = contactDetailSchema.safeParse({ ...summary, company: "Amni Operations", location: "Cairo, Egypt" });
    expect(detail.success).toBe(true);
    expect(detail.data?.company).toBe("Amni Operations");
  });

  it("applies pagination defaults to the list query", () => {
    expect(contactListQuerySchema.parse({})).toMatchObject({ page: 1, pageSize: 20, sortDir: "asc" });
  });
});
