import { z } from "zod";
import { currencySchema } from "./company.js";
import { createDocLineSchema, docLineSchema, docSummarySchema } from "./documents.js";
import { offsetPaginationSchema, searchSchema, sortSchema } from "../pagination.js";

export const supplierStatusSchema = z.enum(["active", "inactive"]);

export const SUPPLIER_STATUSES = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;

export const supplierSchema = z.object({
  code: z.string().regex(/^SUP-\d{4}$/),
  name: z.string().min(1).max(160),
  group: z.string().min(1).max(80),
  email: z.string().email().max(254).optional(),
  phone: z.string().max(40).optional(),
  currency: currencySchema.default("USD"),
  paymentTerms: z.string().max(80).optional(),
  taxId: z.string().max(40).optional(),
  status: supplierStatusSchema,
  outstanding: z.number().nonnegative().finite().default(0),
  totalPurchases: z.number().nonnegative().finite().default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createSupplierInputSchema = supplierSchema.omit({ createdAt: true, updatedAt: true }).partial();

export type Supplier = z.infer<typeof supplierSchema>;
export type SupplierStatus = z.infer<typeof supplierStatusSchema>;

export const purchaseOrderStatusSchema = z.enum(["draft", "submitted", "partially_received", "received", "completed", "cancelled"]);

export const PURCHASE_ORDER_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "partially_received", label: "Partially received" },
  { value: "received", label: "Received" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export const purchaseOrderSchema = z.object({
  code: z.string().regex(/^PO-\d{4}$/),
  supplier: z.object({ code: z.string().min(1).max(40), name: z.string().min(1).max(160) }),
  status: purchaseOrderStatusSchema,
  date: z.string().datetime(),
  expectedDate: z.string().datetime().nullable().optional(),
  currency: currencySchema,
  summary: docSummarySchema,
  items: z.array(docLineSchema),
  owner: z.string().max(120).optional(),
  notes: z.string().max(2_000).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createPurchaseOrderInputSchema = z.object({
  supplierCode: z.string().min(1).max(40),
  date: z.string().datetime().optional(),
  expectedDate: z.string().datetime().nullable().optional(),
  currency: currencySchema.default("USD"),
  notes: z.string().trim().max(2_000).optional(),
  items: z.array(createDocLineSchema).min(1).max(100),
});

export const updatePurchaseOrderInputSchema = createPurchaseOrderInputSchema.partial();

export const purchaseOrderListQuerySchema = offsetPaginationSchema.merge(searchSchema).merge(sortSchema).extend({
  status: purchaseOrderStatusSchema.optional(),
});

export const purchaseOrderListResponseSchema = z.object({
  items: z.array(purchaseOrderSchema),
  meta: z.object({ total: z.number().int().nonnegative(), page: z.number().int().positive(), pageSize: z.number().int().positive() }),
});

export type PurchaseOrderStatus = z.infer<typeof purchaseOrderStatusSchema>;
export type PurchaseOrder = z.infer<typeof purchaseOrderSchema>;
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderInputSchema>;
export type UpdatePurchaseOrderInput = z.infer<typeof updatePurchaseOrderInputSchema>;
export type PurchaseOrderListQuery = z.infer<typeof purchaseOrderListQuerySchema>;
export type PurchaseOrderListResponse = z.infer<typeof purchaseOrderListResponseSchema>;

export const purchaseInvoiceStatusSchema = z.enum(["draft", "submitted", "partially_paid", "paid", "overdue", "cancelled"]);

export const PURCHASE_INVOICE_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "partially_paid", label: "Partially paid" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export const purchaseInvoiceSchema = z.object({
  code: z.string().regex(/^PINV-\d{4}$/),
  supplier: z.object({ code: z.string().min(1).max(40), name: z.string().min(1).max(160) }),
  status: purchaseInvoiceStatusSchema,
  date: z.string().datetime(),
  dueDate: z.string().datetime(),
  currency: currencySchema,
  summary: docSummarySchema,
  items: z.array(docLineSchema),
  amountPaid: z.number().nonnegative().finite().default(0),
  owner: z.string().max(120).optional(),
  purchaseOrderCode: z.string().max(40).optional(),
  notes: z.string().max(2_000).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createPurchaseInvoiceInputSchema = z.object({
  supplierCode: z.string().min(1).max(40),
  date: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  currency: currencySchema.default("USD"),
  purchaseOrderCode: z.string().max(40).optional(),
  notes: z.string().trim().max(2_000).optional(),
  items: z.array(createDocLineSchema).min(1).max(100),
});

export const updatePurchaseInvoiceInputSchema = createPurchaseInvoiceInputSchema.partial();

export const purchaseInvoiceListQuerySchema = offsetPaginationSchema.merge(searchSchema).merge(sortSchema).extend({
  status: purchaseInvoiceStatusSchema.optional(),
});

export const purchaseInvoiceListResponseSchema = z.object({
  items: z.array(purchaseInvoiceSchema),
  meta: z.object({ total: z.number().int().nonnegative(), page: z.number().int().positive(), pageSize: z.number().int().positive() }),
});

export type PurchaseInvoiceStatus = z.infer<typeof purchaseInvoiceStatusSchema>;
export type PurchaseInvoice = z.infer<typeof purchaseInvoiceSchema>;
export type CreatePurchaseInvoiceInput = z.infer<typeof createPurchaseInvoiceInputSchema>;
export type UpdatePurchaseInvoiceInput = z.infer<typeof updatePurchaseInvoiceInputSchema>;
export type PurchaseInvoiceListQuery = z.infer<typeof purchaseInvoiceListQuerySchema>;
export type PurchaseInvoiceListResponse = z.infer<typeof purchaseInvoiceListResponseSchema>;

export const supplierListQuerySchema = offsetPaginationSchema.merge(searchSchema).merge(sortSchema).extend({
  status: supplierStatusSchema.optional(),
});

export const supplierListResponseSchema = z.object({
  items: z.array(supplierSchema),
  meta: z.object({ total: z.number().int().nonnegative(), page: z.number().int().positive(), pageSize: z.number().int().positive() }),
});

export type SupplierListQuery = z.infer<typeof supplierListQuerySchema>;
export type SupplierListResponse = z.infer<typeof supplierListResponseSchema>;
