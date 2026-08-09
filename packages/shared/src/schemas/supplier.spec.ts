import { describe, expect, it } from "vitest";
import {
  supplierDetailSchema,
  supplierListQuerySchema,
  supplierSummarySchema,
} from "./supplier.js";

const summary = {
  id: "SUP-0001",
  name: "Lumina Supplies",
  email: "sales@luminasupplies.com",
  territory: "United States",
  supplierGroup: "Raw Materials",
  status: "active",
  currency: "USD",
  balance: 24_800,
  createdAt: "2026-07-03T09:00:00.000Z",
};

describe("supplier schemas", () => {
  it("parses a valid supplier summary", () => {
    expect(supplierSummarySchema.parse(summary)).toMatchObject({ id: "SUP-0001", status: "active" });
  });

  it("rejects an unknown status", () => {
    expect(supplierSummarySchema.safeParse({ ...summary, status: "archived" }).success).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(supplierSummarySchema.safeParse({ ...summary, email: "not-an-email" }).success).toBe(false);
  });

  it("requires stats and recentOrders on the detail schema", () => {
    const detail = supplierDetailSchema.safeParse(summary);
    expect(detail.success).toBe(false);
  });

  it("applies pagination defaults to the list query", () => {
    expect(supplierListQuerySchema.parse({})).toMatchObject({ page: 1, pageSize: 20, sortDir: "asc" });
  });

  it("rejects a non-whitelisted sortBy", () => {
    expect(supplierListQuerySchema.safeParse({ sortBy: "email" }).success).toBe(false);
  });
});
