import { z } from "zod";

export const erpIdSchema = z.string().trim().min(1).max(255);

export const customerSchema = z.object({
  name: erpIdSchema,
  customer_name: z.string(),
  customer_group: z.string().optional(),
  territory: z.string().optional(),
  customer_type: z.enum(["Company", "Individual"]).optional(),
  default_currency: z.string().optional(),
  default_price_list: z.string().optional(),
  disabled: z.boolean().optional(),
  created: z.string().datetime().optional(),
  modified: z.string().datetime().optional(),
});

export const supplierSchema = z.object({
  name: erpIdSchema,
  supplier_name: z.string(),
  supplier_group: z.string().optional(),
  supplier_type: z.string().optional(),
  default_currency: z.string().optional(),
  disabled: z.boolean().optional(),
});

export const itemSchema = z.object({
  name: erpIdSchema,
  item_code: z.string(),
  item_name: z.string(),
  item_group: z.string().optional(),
  stock_uom: z.string().optional(),
  is_stock_item: z.boolean().optional(),
  is_sales_item: z.boolean().optional(),
  is_purchase_item: z.boolean().optional(),
  standard_rate: z.number().optional(),
  description: z.string().optional(),
  disabled: z.boolean().optional(),
});

export const salesOrderSchema = z.object({
  name: erpIdSchema,
  customer: z.string(),
  transaction_date: z.string().datetime().optional(),
  delivery_date: z.string().datetime().optional(),
  status: z.string().optional(),
  grand_total: z.number().optional(),
  currency: z.string().optional(),
  docstatus: z.number().int().min(0).max(2).optional(),
});

export const salesInvoiceSchema = z.object({
  name: erpIdSchema,
  customer: z.string(),
  posting_date: z.string().datetime().optional(),
  due_date: z.string().datetime().optional(),
  status: z.string().optional(),
  grand_total: z.number().optional(),
  outstanding_amount: z.number().optional(),
  currency: z.string().optional(),
  docstatus: z.number().int().min(0).max(2).optional(),
});

export const purchaseOrderSchema = z.object({
  name: erpIdSchema,
  supplier: z.string(),
  transaction_date: z.string().datetime().optional(),
  status: z.string().optional(),
  grand_total: z.number().optional(),
  currency: z.string().optional(),
  docstatus: z.number().int().min(0).max(2).optional(),
});

export const paymentEntrySchema = z.object({
  name: erpIdSchema,
  party: z.string().optional(),
  payment_type: z.string().optional(),
  posting_date: z.string().datetime().optional(),
  paid_amount: z.number().optional(),
  received_amount: z.number().optional(),
  docstatus: z.number().int().min(0).max(2).optional(),
});

export const itemStockSchema = z.object({
  item: z.string(),
  warehouse: z.string(),
  actual_qty: z.number(),
  projected_qty: z.number().optional(),
  reserved_qty: z.number().optional(),
  valuation_rate: z.number().optional(),
});

export type Customer = z.infer<typeof customerSchema>;
export type Supplier = z.infer<typeof supplierSchema>;
export type Item = z.infer<typeof itemSchema>;
export type SalesOrder = z.infer<typeof salesOrderSchema>;
export type SalesInvoice = z.infer<typeof salesInvoiceSchema>;
export type PurchaseOrder = z.infer<typeof purchaseOrderSchema>;
export type PaymentEntry = z.infer<typeof paymentEntrySchema>;
export type ItemStock = z.infer<typeof itemStockSchema>;
