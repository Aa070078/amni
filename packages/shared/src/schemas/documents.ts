import { z } from "zod";

export const docLineSchema = z.object({
  lineNo: z.number().int().positive(),
  product: z.string().min(1).max(120),
  name: z.string().min(1).max(200),
  uom: z.string().min(1).max(12),
  qty: z.number().positive().finite(),
  rate: z.number().nonnegative().finite(),
  amount: z.number().nonnegative().finite(),
});

export const createDocLineSchema = z.object({
  product: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(200).optional(),
  uom: z.string().trim().min(1).max(12).default("pcs"),
  qty: z.coerce.number().positive().finite(),
  rate: z.coerce.number().nonnegative().finite(),
});

export const docSummarySchema = z.object({
  subtotal: z.number().nonnegative().finite(),
  discount: z.number().nonnegative().finite().default(0),
  tax: z.number().nonnegative().finite().default(0),
  total: z.number().nonnegative().finite(),
});

export type DocLine = z.infer<typeof docLineSchema>;
export type CreateDocLine = z.infer<typeof createDocLineSchema>;
export type DocSummary = z.infer<typeof docSummarySchema>;

export const documentReferenceSchema = z.object({
  type: z.enum(["quotation", "sales_order", "sales_invoice", "purchase_order", "purchase_invoice"]),
  code: z.string().min(1).max(40),
});

export type DocumentReference = z.infer<typeof documentReferenceSchema>;
