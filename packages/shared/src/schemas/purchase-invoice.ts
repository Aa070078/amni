import { z } from "zod";
import { pageSchema } from "../pagination.js";
import { currencySchema } from "./company.js";
import { purchaseOrderItemSchema } from "./purchase-order.js";

export const purchaseInvoiceStatusSchema = z.enum([
  "draft",
  "submitted",
  "partially_paid",
  "paid",
  "cancelled",
]);

const purchaseInvoiceFields = z.object({
  id: z.string().min(1).max(64),
  number: z.string().min(1).max(40),
  supplierId: z.string().min(1).max(64),
  supplierName: z.string().min(1).max(120),
  date: z.string().datetime(),
  dueDate: z.string().datetime().optional(),
  total: z.number().finite().nonnegative(),
  paid: z.number().finite().nonnegative(),
  outstanding: z.number().finite().nonnegative(),
  status: purchaseInvoiceStatusSchema,
  currency: currencySchema,
  createdAt: z.string().datetime(),
});

function validateInvoiceTotals(
  invoice: { total: number; paid: number; outstanding: number },
  ctx: z.RefinementCtx,
): void {
  if (invoice.outstanding > invoice.total) {
    ctx.addIssue({
      code: "custom",
      path: ["outstanding"],
      message: "Outstanding cannot exceed the invoice total",
    });
  }
  if (invoice.paid > invoice.total) {
    ctx.addIssue({
      code: "custom",
      path: ["paid"],
      message: "Paid amount cannot exceed the invoice total",
    });
  }
}

export const purchaseInvoiceSummarySchema = purchaseInvoiceFields.superRefine(validateInvoiceTotals);

export const purchaseInvoiceDetailSchema = purchaseInvoiceFields
  .extend({
    items: z.array(purchaseOrderItemSchema).max(100),
    notes: z.string().max(1000).optional(),
    submittedAt: z.string().datetime().optional(),
    paidAt: z.string().datetime().optional(),
  })
  .superRefine(validateInvoiceTotals);

export const purchaseInvoiceListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["number", "supplierName", "date", "dueDate", "total"]).optional(),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
  q: z.string().trim().max(200).optional(),
  status: purchaseInvoiceStatusSchema.optional(),
  supplierId: z.string().trim().max(64).optional(),
});

export const purchaseInvoiceListResponseSchema = pageSchema(purchaseInvoiceSummarySchema);

export type PurchaseInvoiceStatus = z.infer<typeof purchaseInvoiceStatusSchema>;
export type PurchaseInvoiceSummary = z.infer<typeof purchaseInvoiceSummarySchema>;
export type PurchaseInvoiceDetail = z.infer<typeof purchaseInvoiceDetailSchema>;
export type PurchaseInvoiceListQuery = z.infer<typeof purchaseInvoiceListQuerySchema>;
export type PurchaseInvoiceListResponse = z.infer<typeof purchaseInvoiceListResponseSchema>;
