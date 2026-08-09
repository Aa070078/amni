import { describe, expect, it } from "vitest";
import {
  purchaseInvoiceDetailSchema,
  purchaseInvoiceListQuerySchema,
  purchaseInvoiceSummarySchema,
} from "./purchase-invoice.js";

const summary = {
  id: "PINV-0002",
  number: "PINV-0002",
  supplierId: "SUP-0002",
  supplierName: "Apex Steel",
  date: "2026-07-18T10:00:00.000Z",
  total: 22_600,
  paid: 10_000,
  outstanding: 12_600,
  status: "partially_paid",
  currency: "USD",
  createdAt: "2026-07-18T10:00:00.000Z",
};

describe("purchase invoice schemas", () => {
  it("parses a valid purchase invoice summary", () => {
    expect(purchaseInvoiceSummarySchema.parse(summary)).toMatchObject({
      number: "PINV-0002",
      status: "partially_paid",
    });
  });

  it("rejects an unknown status", () => {
    expect(purchaseInvoiceSummarySchema.safeParse({ ...summary, status: "refunded" }).success).toBe(false);
  });

  it("requires items on the detail schema", () => {
    expect(purchaseInvoiceDetailSchema.safeParse(summary).success).toBe(false);
  });

  it("rejects an outstanding amount that exceeds the total", () => {
    expect(purchaseInvoiceSummarySchema.safeParse({ ...summary, outstanding: 30_000 }).success).toBe(false);
  });

  it("applies pagination defaults to the list query", () => {
    expect(purchaseInvoiceListQuerySchema.parse({})).toMatchObject({ page: 1, pageSize: 20, sortDir: "asc" });
  });
});
