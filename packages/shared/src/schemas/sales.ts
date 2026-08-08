import { z } from "zod";
import { currencySchema } from "./company.js";
import { createDocLineSchema, docLineSchema, docSummarySchema } from "./documents.js";
import { offsetPaginationSchema, searchSchema, sortSchema } from "../pagination.js";

export const customerSummarySchema = z.object({
  code: z.string().min(1).max(40),
  name: z.string().min(1).max(160),
});

export const customerStatusSchema = z.enum(["active", "inactive"]);

export const customerSchema = customerSummarySchema.extend({
  type: z.enum(["company", "individual"]),
  group: z.string().min(1).max(80),
  territory: z.string().max(120).optional(),
  email: z.string().email().max(254).optional(),
  phone: z.string().max(40).optional(),
  currency: currencySchema.default("USD"),
  paymentTerms: z.string().max(80).optional(),
  status: customerStatusSchema,
  outstanding: z.number().nonnegative().finite().default(0),
  totalSales: z.number().nonnegative().finite().default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createCustomerInputSchema = customerSchema
  .omit({ createdAt: true, updatedAt: true })
  .partial()
  .extend({ code: z.string().regex(/^CUS-\d{4}$/).optional() });

export type Customer = z.infer<typeof customerSchema>;
export type CustomerStatus = z.infer<typeof customerStatusSchema>;

export const quotationStatusSchema = z.enum(["draft", "sent", "accepted", "rejected", "expired", "converted"]);

export const QUOTATION_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "expired", label: "Expired" },
  { value: "converted", label: "Converted" },
] as const;

export const quotationSchema = z.object({
  code: z.string().regex(/^QT-\d{4}$/),
  customer: customerSummarySchema,
  status: quotationStatusSchema,
  date: z.string().datetime(),
  validUntil: z.string().datetime().nullable().optional(),
  currency: currencySchema,
  summary: docSummarySchema,
  items: z.array(docLineSchema),
  owner: z.string().max(120).optional(),
  notes: z.string().max(2_000).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createQuotationInputSchema = z.object({
  customerCode: z.string().min(1).max(40),
  date: z.string().datetime().optional(),
  validUntil: z.string().datetime().nullable().optional(),
  currency: currencySchema.default("USD"),
  notes: z.string().trim().max(2_000).optional(),
  items: z.array(createDocLineSchema).min(1).max(100),
});

export const updateQuotationInputSchema = createQuotationInputSchema.partial();

export const quotationListQuerySchema = offsetPaginationSchema.merge(searchSchema).merge(sortSchema).extend({
  status: quotationStatusSchema.optional(),
});

export const quotationListResponseSchema = z.object({
  items: z.array(quotationSchema),
  meta: z.object({ total: z.number().int().nonnegative(), page: z.number().int().positive(), pageSize: z.number().int().positive() }),
});

export type QuotationStatus = z.infer<typeof quotationStatusSchema>;
export type Quotation = z.infer<typeof quotationSchema>;
export type CreateQuotationInput = z.infer<typeof createQuotationInputSchema>;
export type UpdateQuotationInput = z.infer<typeof updateQuotationInputSchema>;
export type QuotationListQuery = z.infer<typeof quotationListQuerySchema>;
export type QuotationListResponse = z.infer<typeof quotationListResponseSchema>;

export const salesOrderStatusSchema = z.enum(["draft", "submitted", "partially_delivered", "delivered", "completed", "cancelled"]);

export const SALES_ORDER_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "partially_delivered", label: "Partially delivered" },
  { value: "delivered", label: "Delivered" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export const salesOrderSchema = z.object({
  code: z.string().regex(/^SO-\d{4}$/),
  customer: customerSummarySchema,
  status: salesOrderStatusSchema,
  date: z.string().datetime(),
  deliveryDate: z.string().datetime().nullable().optional(),
  currency: currencySchema,
  summary: docSummarySchema,
  items: z.array(docLineSchema),
  owner: z.string().max(120).optional(),
  quotationCode: z.string().max(40).optional(),
  notes: z.string().max(2_000).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createSalesOrderInputSchema = z.object({
  customerCode: z.string().min(1).max(40),
  date: z.string().datetime().optional(),
  deliveryDate: z.string().datetime().nullable().optional(),
  currency: currencySchema.default("USD"),
  quotationCode: z.string().max(40).optional(),
  notes: z.string().trim().max(2_000).optional(),
  items: z.array(createDocLineSchema).min(1).max(100),
});

export const updateSalesOrderInputSchema = createSalesOrderInputSchema.partial();

export const salesOrderListQuerySchema = offsetPaginationSchema.merge(searchSchema).merge(sortSchema).extend({
  status: salesOrderStatusSchema.optional(),
});

export const salesOrderListResponseSchema = z.object({
  items: z.array(salesOrderSchema),
  meta: z.object({ total: z.number().int().nonnegative(), page: z.number().int().positive(), pageSize: z.number().int().positive() }),
});

export type SalesOrderStatus = z.infer<typeof salesOrderStatusSchema>;
export type SalesOrder = z.infer<typeof salesOrderSchema>;
export type CreateSalesOrderInput = z.infer<typeof createSalesOrderInputSchema>;
export type UpdateSalesOrderInput = z.infer<typeof updateSalesOrderInputSchema>;
export type SalesOrderListQuery = z.infer<typeof salesOrderListQuerySchema>;
export type SalesOrderListResponse = z.infer<typeof salesOrderListResponseSchema>;

export const salesInvoiceStatusSchema = z.enum(["draft", "submitted", "partially_paid", "paid", "overdue", "cancelled"]);

export const SALES_INVOICE_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "partially_paid", label: "Partially paid" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export const salesInvoiceSchema = z.object({
  code: z.string().regex(/^INV-\d{4}$/),
  customer: customerSummarySchema,
  status: salesInvoiceStatusSchema,
  date: z.string().datetime(),
  dueDate: z.string().datetime(),
  currency: currencySchema,
  summary: docSummarySchema,
  items: z.array(docLineSchema),
  amountPaid: z.number().nonnegative().finite().default(0),
  owner: z.string().max(120).optional(),
  salesOrderCode: z.string().max(40).optional(),
  notes: z.string().max(2_000).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createSalesInvoiceInputSchema = z.object({
  customerCode: z.string().min(1).max(40),
  date: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  currency: currencySchema.default("USD"),
  salesOrderCode: z.string().max(40).optional(),
  notes: z.string().trim().max(2_000).optional(),
  items: z.array(createDocLineSchema).min(1).max(100),
});

export const updateSalesInvoiceInputSchema = createSalesInvoiceInputSchema.partial();

export const recordPaymentInputSchema = z.object({
  amount: z.coerce.number().positive().finite(),
  method: z.string().trim().min(1).max(40).default("bank_transfer"),
  date: z.string().datetime().optional(),
  reference: z.string().trim().max(80).optional(),
});

export const salesInvoiceListQuerySchema = offsetPaginationSchema.merge(searchSchema).merge(sortSchema).extend({
  status: salesInvoiceStatusSchema.optional(),
});

export const salesInvoiceListResponseSchema = z.object({
  items: z.array(salesInvoiceSchema),
  meta: z.object({ total: z.number().int().nonnegative(), page: z.number().int().positive(), pageSize: z.number().int().positive() }),
});

export type SalesInvoiceStatus = z.infer<typeof salesInvoiceStatusSchema>;
export type SalesInvoice = z.infer<typeof salesInvoiceSchema>;
export type CreateSalesInvoiceInput = z.infer<typeof createSalesInvoiceInputSchema>;
export type UpdateSalesInvoiceInput = z.infer<typeof updateSalesInvoiceInputSchema>;
export type RecordPaymentInput = z.infer<typeof recordPaymentInputSchema>;
export type SalesInvoiceListQuery = z.infer<typeof salesInvoiceListQuerySchema>;
export type SalesInvoiceListResponse = z.infer<typeof salesInvoiceListResponseSchema>;

export const customerListQuerySchema = offsetPaginationSchema.merge(searchSchema).merge(sortSchema).extend({
  status: customerStatusSchema.optional(),
});

export const customerListResponseSchema = z.object({
  items: z.array(customerSchema),
  meta: z.object({ total: z.number().int().nonnegative(), page: z.number().int().positive(), pageSize: z.number().int().positive() }),
});

export type CustomerListQuery = z.infer<typeof customerListQuerySchema>;
export type CustomerListResponse = z.infer<typeof customerListResponseSchema>;
