import { z } from "zod";
import { pageSchema } from "../pagination.js";
import { currencySchema } from "./company.js";

export const purchaseOrderStatusSchema = z.enum(["draft", "submitted", "received", "cancelled"]);

export const purchaseOrderItemSchema = z.object({
  item: z.string().min(1).max(120),
  quantity: z.number().positive(),
  rate: z.number().finite().nonnegative(),
  amount: z.number().finite().nonnegative(),
});

export const purchaseOrderSummarySchema = z.object({
  id: z.string().min(1).max(64),
  number: z.string().min(1).max(40),
  supplierId: z.string().min(1).max(64),
  supplierName: z.string().min(1).max(120),
  date: z.string().datetime(),
  expectedDate: z.string().datetime().optional(),
  total: z.number().finite().nonnegative(),
  status: purchaseOrderStatusSchema,
  currency: currencySchema,
  createdAt: z.string().datetime(),
});

export const purchaseOrderDetailSchema = purchaseOrderSummarySchema.extend({
  items: z.array(purchaseOrderItemSchema).max(100),
  notes: z.string().max(1000).optional(),
  submittedAt: z.string().datetime().optional(),
  receivedAt: z.string().datetime().optional(),
});

export const purchaseOrderListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["number", "supplierName", "date", "expectedDate", "total"]).optional(),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
  q: z.string().trim().max(200).optional(),
  status: purchaseOrderStatusSchema.optional(),
  supplierId: z.string().trim().max(64).optional(),
});

export const purchaseOrderListResponseSchema = pageSchema(purchaseOrderSummarySchema);

export type PurchaseOrderStatus = z.infer<typeof purchaseOrderStatusSchema>;
export type PurchaseOrderItem = z.infer<typeof purchaseOrderItemSchema>;
export type PurchaseOrderSummary = z.infer<typeof purchaseOrderSummarySchema>;
export type PurchaseOrderDetail = z.infer<typeof purchaseOrderDetailSchema>;
export type PurchaseOrderListQuery = z.infer<typeof purchaseOrderListQuerySchema>;
export type PurchaseOrderListResponse = z.infer<typeof purchaseOrderListResponseSchema>;
