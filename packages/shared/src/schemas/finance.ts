import { z } from "zod";
import { currencySchema } from "./company.js";
import { offsetPaginationSchema, searchSchema, sortSchema } from "../pagination.js";

export const expenseStatusSchema = z.enum(["draft", "submitted", "approved", "rejected", "paid"]);

export const EXPENSE_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "paid", label: "Paid" },
] as const;

export const expenseCategorySchema = z.enum([
  "travel",
  "office",
  "utilities",
  "software",
  "marketing",
  "professional_services",
  "rent",
  "equipment",
  "other",
]);

export const EXPENSE_CATEGORIES = [
  { value: "travel", label: "Travel" },
  { value: "office", label: "Office supplies" },
  { value: "utilities", label: "Utilities" },
  { value: "software", label: "Software" },
  { value: "marketing", label: "Marketing" },
  { value: "professional_services", label: "Professional services" },
  { value: "rent", label: "Rent" },
  { value: "equipment", label: "Equipment" },
  { value: "other", label: "Other" },
] as const;

export const expenseSchema = z.object({
  code: z.string().regex(/^EXP-\d{4}$/),
  category: expenseCategorySchema,
  date: z.string().datetime(),
  description: z.string().min(1).max(240),
  supplier: z.string().max(160).optional(),
  amount: z.number().positive().finite(),
  currency: currencySchema.default("USD"),
  vat: z.number().nonnegative().finite().default(0),
  status: expenseStatusSchema,
  claimedBy: z.string().max(120).optional(),
  paymentRef: z.string().max(80).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createExpenseInputSchema = z.object({
  category: expenseCategorySchema,
  date: z.string().datetime().optional(),
  description: z.string().trim().min(1).max(240),
  supplier: z.string().trim().max(160).optional(),
  amount: z.coerce.number().positive().finite(),
  currency: currencySchema.default("USD"),
  vat: z.coerce.number().nonnegative().finite().default(0),
  status: expenseStatusSchema.default("draft"),
  claimedBy: z.string().trim().max(120).optional(),
});

export const updateExpenseInputSchema = createExpenseInputSchema.partial();

export const expenseListQuerySchema = offsetPaginationSchema.merge(searchSchema).merge(sortSchema).extend({
  category: expenseCategorySchema.optional(),
  status: expenseStatusSchema.optional(),
});

export const expenseListResponseSchema = z.object({
  items: z.array(expenseSchema),
  meta: z.object({ total: z.number().int().nonnegative(), page: z.number().int().positive(), pageSize: z.number().int().positive() }),
});

export type ExpenseStatus = z.infer<typeof expenseStatusSchema>;
export type ExpenseCategory = z.infer<typeof expenseCategorySchema>;
export type Expense = z.infer<typeof expenseSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseInputSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseInputSchema>;
export type ExpenseListQuery = z.infer<typeof expenseListQuerySchema>;
export type ExpenseListResponse = z.infer<typeof expenseListResponseSchema>;

export const paymentMethodSchema = z.enum(["bank_transfer", "cash", "card", "check", "ach"]);

export const PAYMENT_METHODS = [
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "check", label: "Check" },
  { value: "ach", label: "ACH" },
] as const;

export const paymentSchema = z.object({
  code: z.string().regex(/^PAY-\d{4}$/),
  type: z.enum(["incoming", "outgoing"]),
  date: z.string().datetime(),
  party: z.string().min(1).max(160),
  reference: z.string().max(80).optional(),
  invoiceCode: z.string().max(40).optional(),
  amount: z.number().positive().finite(),
  currency: currencySchema.default("USD"),
  method: paymentMethodSchema,
  status: z.enum(["pending", "cleared", "failed"]).default("cleared"),
  recordedBy: z.string().max(120).optional(),
});

export const createPaymentInputSchema = z.object({
  type: z.enum(["incoming", "outgoing"]),
  date: z.string().datetime().optional(),
  party: z.string().trim().min(1).max(160),
  reference: z.string().trim().max(80).optional(),
  invoiceCode: z.string().trim().max(40).optional(),
  amount: z.coerce.number().positive().finite(),
  currency: currencySchema.default("USD"),
  method: paymentMethodSchema.default("bank_transfer"),
});

export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
export type Payment = z.infer<typeof paymentSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentInputSchema>;

export const financeKpiSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(80),
  value: z.number().finite(),
  format: z.enum(["currency", "number", "percent"]),
  currency: currencySchema.optional(),
  delta: z.number().finite().optional(),
  trend: z.enum(["up", "down", "flat"]).optional(),
  hint: z.string().max(120).optional(),
  sparkline: z.array(z.number().finite()).min(2).max(24).optional(),
});

export const financeSeriesPointSchema = z.object({
  label: z.string().min(1).max(32),
  value: z.number().finite(),
});

export const financeArBucketSchema = z.object({
  label: z.string().min(1).max(32),
  value: z.number().finite(),
});

export const financeOverviewSchema = z.object({
  asOf: z.string().datetime(),
  kpis: z.array(financeKpiSchema),
  revenueTrend: z.array(financeSeriesPointSchema),
  cashTrend: z.array(financeSeriesPointSchema),
  expensesTrend: z.array(financeSeriesPointSchema),
  arAging: z.array(financeArBucketSchema),
  apAging: z.array(financeArBucketSchema),
  monthlyTotals: z.array(
    z.object({ month: z.string().min(1).max(32), revenue: z.number().finite(), expenses: z.number().finite(), profit: z.number().finite() }),
  ),
});

export const reportRowSchema = z.object({
  account: z.string().min(1).max(160),
  amount: z.number().finite(),
});

export const financialReportSchema = z.object({
  title: z.string().min(1).max(120),
  period: z.string().min(1).max(80),
  currency: currencySchema,
  rows: z.array(reportRowSchema),
  total: z.number().finite(),
  generatedAt: z.string().datetime(),
});

export const reportTypeSchema = z.enum(["income_statement", "balance_sheet", "cash_flow", "ar_aging", "ap_aging"]);

export type FinanceKpi = z.infer<typeof financeKpiSchema>;
export type FinanceSeriesPoint = z.infer<typeof financeSeriesPointSchema>;
export type FinanceArBucket = z.infer<typeof financeArBucketSchema>;
export type FinanceOverview = z.infer<typeof financeOverviewSchema>;
export type ReportRow = z.infer<typeof reportRowSchema>;
export type FinancialReport = z.infer<typeof financialReportSchema>;
export type ReportType = z.infer<typeof reportTypeSchema>;

export const paymentListQuerySchema = offsetPaginationSchema.merge(searchSchema).merge(sortSchema).extend({
  type: z.enum(["incoming", "outgoing"]).optional(),
});

export const paymentListResponseSchema = z.object({
  items: z.array(paymentSchema),
  meta: z.object({ total: z.number().int().nonnegative(), page: z.number().int().positive(), pageSize: z.number().int().positive() }),
});

export type PaymentListQuery = z.infer<typeof paymentListQuerySchema>;
export type PaymentListResponse = z.infer<typeof paymentListResponseSchema>;
