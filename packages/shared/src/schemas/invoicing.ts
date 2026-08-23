import { z } from "zod";
import { currencySchema } from "./company.js";
import { createDocLineSchema, docLineSchema, docSummarySchema } from "./documents.js";
import { customerSummarySchema } from "./sales.js";
import { financeKpiSchema } from "./finance.js";
import { offsetPaginationSchema, searchSchema, sortSchema } from "../pagination.js";

export const creditNoteStatusSchema = z.enum(["draft", "issued", "applied", "void"]);

export const CREDIT_NOTE_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "issued", label: "Issued" },
  { value: "applied", label: "Applied" },
  { value: "void", label: "Void" },
] as const;

export const creditNoteSchema = z.object({
  code: z.string().min(1).max(160),
  invoiceCode: z.string().min(1).max(160),
  customer: customerSummarySchema,
  status: creditNoteStatusSchema,
  date: z.string().datetime(),
  currency: currencySchema,
  summary: docSummarySchema,
  items: z.array(docLineSchema),
  reason: z.string().max(2_000).optional(),
  notes: z.string().max(2_000).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createCreditNoteInputSchema = z.object({
  invoiceCode: z.string().min(1).max(160),
  date: z.string().datetime().optional(),
  currency: currencySchema.default("USD"),
  reason: z.string().trim().max(2_000).optional(),
  notes: z.string().trim().max(2_000).optional(),
  items: z.array(createDocLineSchema).min(1).max(100),
});

export const updateCreditNoteInputSchema = createCreditNoteInputSchema.partial();

export const creditNoteListQuerySchema = offsetPaginationSchema.merge(searchSchema).merge(sortSchema).extend({
  status: creditNoteStatusSchema.optional(),
});

export const creditNoteListResponseSchema = z.object({
  items: z.array(creditNoteSchema),
  meta: z.object({ total: z.number().int().nonnegative(), page: z.number().int().positive(), pageSize: z.number().int().positive() }),
});

export type CreditNoteStatus = z.infer<typeof creditNoteStatusSchema>;
export type CreditNote = z.infer<typeof creditNoteSchema>;
export type CreateCreditNoteInput = z.infer<typeof createCreditNoteInputSchema>;
export type UpdateCreditNoteInput = z.infer<typeof updateCreditNoteInputSchema>;
export type CreditNoteListQuery = z.infer<typeof creditNoteListQuerySchema>;
export type CreditNoteListResponse = z.infer<typeof creditNoteListResponseSchema>;

export const recurringIntervalSchema = z.enum(["daily", "weekly", "monthly", "quarterly", "yearly"]);

export const RECURRING_INTERVALS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
] as const;

export const recurringProfileStatusSchema = z.enum(["active", "paused", "ended"]);

export const RECURRING_PROFILE_STATUSES = [
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "ended", label: "Ended" },
] as const;

export const recurringProfileSchema = z.object({
  code: z.string().min(1).max(160),
  customer: customerSummarySchema,
  name: z.string().min(1).max(160),
  interval: recurringIntervalSchema,
  dayOfPeriod: z.number().int().min(1).max(31),
  currency: currencySchema,
  summary: docSummarySchema,
  items: z.array(docLineSchema),
  nextRun: z.string().datetime(),
  lastRun: z.string().datetime().nullable().optional(),
  status: recurringProfileStatusSchema,
  notes: z.string().max(2_000).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createRecurringProfileInputSchema = z.object({
  customerCode: z.string().min(1).max(160),
  name: z.string().trim().min(1).max(160),
  interval: recurringIntervalSchema,
  dayOfPeriod: z.coerce.number().int().min(1).max(31).default(1),
  currency: currencySchema.default("USD"),
  notes: z.string().trim().max(2_000).optional(),
  items: z.array(createDocLineSchema).min(1).max(100),
});

export const updateRecurringProfileInputSchema = createRecurringProfileInputSchema.partial();

export const recurringListQuerySchema = offsetPaginationSchema.merge(searchSchema).merge(sortSchema).extend({
  status: recurringProfileStatusSchema.optional(),
});

export const recurringListResponseSchema = z.object({
  items: z.array(recurringProfileSchema),
  meta: z.object({ total: z.number().int().nonnegative(), page: z.number().int().positive(), pageSize: z.number().int().positive() }),
});

export type RecurringInterval = z.infer<typeof recurringIntervalSchema>;
export type RecurringProfileStatus = z.infer<typeof recurringProfileStatusSchema>;
export type RecurringProfile = z.infer<typeof recurringProfileSchema>;
export type CreateRecurringProfileInput = z.infer<typeof createRecurringProfileInputSchema>;
export type UpdateRecurringProfileInput = z.infer<typeof updateRecurringProfileInputSchema>;
export type RecurringListQuery = z.infer<typeof recurringListQuerySchema>;
export type RecurringListResponse = z.infer<typeof recurringListResponseSchema>;

export const invoicingOverviewSchema = z.object({
  asOf: z.string().datetime(),
  kpis: z.array(financeKpiSchema),
  creditNotesOutstanding: z.number().nonnegative().finite(),
  recurringActive: z.number().int().nonnegative(),
  dueSoonBills: z.array(
    z.object({ code: z.string(), supplier: z.string(), amount: z.number().finite(), dueDate: z.string().datetime() }),
  ),
});

export type InvoicingOverview = z.infer<typeof invoicingOverviewSchema>;
