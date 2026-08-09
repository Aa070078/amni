import { z } from "zod";
import { currencySchema } from "./company.js";
import { expenseCategorySchema } from "./finance.js";
import { financeKpiSchema } from "./finance.js";
import { offsetPaginationSchema, searchSchema, sortSchema } from "../pagination.js";

export const expenseClaimStatusSchema = z.enum(["draft", "submitted", "approved", "rejected", "paid"]);

export const EXPENSE_CLAIM_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "paid", label: "Paid" },
] as const;

export const expenseClaimLineSchema = z.object({
  code: z.string().min(1).max(40),
  description: z.string().min(1).max(240),
  category: expenseCategorySchema,
  date: z.string().datetime(),
  amount: z.number().positive().finite(),
});

export const expenseClaimSchema = z.object({
  code: z.string().regex(/^CLM-\d{4}$/),
  employee: z.string().min(1).max(120),
  department: z.string().max(80).optional(),
  purpose: z.string().min(1).max(240),
  items: z.array(expenseClaimLineSchema).min(1),
  total: z.number().positive().finite(),
  currency: currencySchema.default("USD"),
  status: expenseClaimStatusSchema,
  paidDate: z.string().datetime().nullable().optional(),
  notes: z.string().max(2_000).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createExpenseClaimInputSchema = z.object({
  employee: z.string().trim().min(1).max(120),
  department: z.string().trim().max(80).optional(),
  purpose: z.string().trim().min(1).max(240),
  currency: currencySchema.default("USD"),
  notes: z.string().trim().max(2_000).optional(),
  items: z
    .array(
      z.object({
        description: z.string().trim().min(1).max(240),
        category: expenseCategorySchema,
        date: z.string().datetime(),
        amount: z.coerce.number().positive().finite(),
      }),
    )
    .min(1)
    .max(50),
});

export const updateExpenseClaimInputSchema = createExpenseClaimInputSchema.partial();

export const expenseClaimListQuerySchema = offsetPaginationSchema.merge(searchSchema).merge(sortSchema).extend({
  status: expenseClaimStatusSchema.optional(),
});

export const expenseClaimListResponseSchema = z.object({
  items: z.array(expenseClaimSchema),
  meta: z.object({ total: z.number().int().nonnegative(), page: z.number().int().positive(), pageSize: z.number().int().positive() }),
});

export type ExpenseClaimStatus = z.infer<typeof expenseClaimStatusSchema>;
export type ExpenseClaimLine = z.infer<typeof expenseClaimLineSchema>;
export type ExpenseClaim = z.infer<typeof expenseClaimSchema>;
export type CreateExpenseClaimInput = z.infer<typeof createExpenseClaimInputSchema>;
export type UpdateExpenseClaimInput = z.infer<typeof updateExpenseClaimInputSchema>;
export type ExpenseClaimListQuery = z.infer<typeof expenseClaimListQuerySchema>;
export type ExpenseClaimListResponse = z.infer<typeof expenseClaimListResponseSchema>;

export const expenseCategoryRecordStatusSchema = z.enum(["active", "archived"]);

export const expenseCategoryRecordSchema = z.object({
  code: z.string().regex(/^CAT-\d{4}$/),
  name: z.string().min(1).max(80),
  color: z.string().max(40).default("zinc"),
  status: expenseCategoryRecordStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createExpenseCategoryInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  color: z.string().trim().max(40).default("zinc"),
});

export const updateExpenseCategoryInputSchema = createExpenseCategoryInputSchema.partial();

export const expenseCategoryListQuerySchema = offsetPaginationSchema.merge(searchSchema).merge(sortSchema).extend({
  status: expenseCategoryRecordStatusSchema.optional(),
});

export const expenseCategoryListResponseSchema = z.object({
  items: z.array(expenseCategoryRecordSchema),
  meta: z.object({ total: z.number().int().nonnegative(), page: z.number().int().positive(), pageSize: z.number().int().positive() }),
});

export type ExpenseCategoryRecordStatus = z.infer<typeof expenseCategoryRecordStatusSchema>;
export type ExpenseCategoryRecord = z.infer<typeof expenseCategoryRecordSchema>;
export type CreateExpenseCategoryInput = z.infer<typeof createExpenseCategoryInputSchema>;
export type UpdateExpenseCategoryInput = z.infer<typeof updateExpenseCategoryInputSchema>;
export type ExpenseCategoryListQuery = z.infer<typeof expenseCategoryListQuerySchema>;
export type ExpenseCategoryListResponse = z.infer<typeof expenseCategoryListResponseSchema>;

export const expensesOverviewSchema = z.object({
  asOf: z.string().datetime(),
  kpis: z.array(financeKpiSchema),
  topCategories: z.array(
    z.object({ category: expenseCategorySchema, amount: z.number().finite(), count: z.number().int().nonnegative() }),
  ),
});

export type ExpensesOverview = z.infer<typeof expensesOverviewSchema>;
