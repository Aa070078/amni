import { describe, expect, it } from "vitest";
import {
  purchaseOrderDetailSchema,
  purchaseOrderListQuerySchema,
  purchaseOrderSummarySchema,
} from "./purchase-order.js";

const summary = {
  id: "PO-0002",
  number: "PO-0002",
  supplierId: "SUP-0002",
  supplierName: "Apex Steel",
  date: "2026-07-11T08:30:00.000Z",
  total: 22_600,
  status: "submitted",
  currency: "USD",
  createdAt: "2026-07-11T08:30:00.000Z",
};

describe("purchase order schemas", () => {
  it("parses a valid purchase order summary", () => {
    expect(purchaseOrderSummarySchema.parse(summary)).toMatchObject({ number: "PO-0002", status: "submitted" });
  });

  it("rejects an unknown status", () => {
    expect(purchaseOrderSummarySchema.safeParse({ ...summary, status: "shipped" }).success).toBe(false);
  });

  it("requires items on the detail schema", () => {
    expect(purchaseOrderDetailSchema.safeParse(summary).success).toBe(false);
  });

  it("parses a valid detail with items", () => {
    const detail = purchaseOrderDetailSchema.safeParse({
      ...summary,
      items: [{ item: "Steel Frame Bracket 2m", quantity: 400, rate: 28.25, amount: 11_300 }],
    });
    expect(detail.success).toBe(true);
    expect(detail.data?.items[0]?.amount).toBe(11_300);
  });

  it("rejects a negative item amount", () => {
    const detail = purchaseOrderDetailSchema.safeParse({
      ...summary,
      items: [{ item: "Steel Frame Bracket 2m", quantity: 400, rate: 28.25, amount: -1 }],
    });
    expect(detail.success).toBe(false);
  });

  it("applies pagination defaults to the list query", () => {
    expect(purchaseOrderListQuerySchema.parse({})).toMatchObject({ page: 1, pageSize: 20, sortDir: "asc" });
  });
});
