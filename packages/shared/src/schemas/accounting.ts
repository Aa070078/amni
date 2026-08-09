import { z } from "zod";
import { currencySchema } from "./company.js";
import { financeKpiSchema } from "./finance.js";
import { offsetPaginationSchema, searchSchema, sortSchema } from "../pagination.js";

export const accountTypeSchema = z.enum(["asset", "liability", "equity", "income", "expense"]);

export const ACCOUNT_TYPES = [
  { value: "asset", label: "Asset" },
  { value: "liability", label: "Liability" },
  { value: "equity", label: "Equity" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
] as const;

export const accountStatusSchema = z.enum(["active", "archived"]);

export const accountSchema = z.object({
  code: z.string().regex(/^AC-\d{4}$/),
  name: z.string().min(1).max(160),
  type: accountTypeSchema,
  group: z.string().min(1).max(80),
  currency: currencySchema.default("USD"),
  openingBalance: z.number().finite().default(0),
  balance: z.number().finite().default(0),
  isGroup: z.boolean().default(false),
  status: accountStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createAccountInputSchema = z.object({
  name: z.string().trim().min(1).max(160),
  type: accountTypeSchema,
  group: z.string().trim().min(1).max(80),
  currency: currencySchema.default("USD"),
  openingBalance: z.coerce.number().finite().default(0),
  isGroup: z.boolean().default(false),
});

export const updateAccountInputSchema = createAccountInputSchema.partial();

export const accountListQuerySchema = offsetPaginationSchema.merge(searchSchema).merge(sortSchema).extend({
  type: accountTypeSchema.optional(),
  status: accountStatusSchema.optional(),
});

export const accountListResponseSchema = z.object({
  items: z.array(accountSchema),
  meta: z.object({ total: z.number().int().nonnegative(), page: z.number().int().positive(), pageSize: z.number().int().positive() }),
});

export type AccountType = z.infer<typeof accountTypeSchema>;
export type AccountStatus = z.infer<typeof accountStatusSchema>;
export type Account = z.infer<typeof accountSchema>;
export type CreateAccountInput = z.infer<typeof createAccountInputSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountInputSchema>;
export type AccountListQuery = z.infer<typeof accountListQuerySchema>;
export type AccountListResponse = z.infer<typeof accountListResponseSchema>;

export const journalEntryStatusSchema = z.enum(["draft", "posted", "reversed"]);

export const JOURNAL_ENTRY_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "posted", label: "Posted" },
  { value: "reversed", label: "Reversed" },
] as const;

export const journalEntryLineSchema = z.object({
  accountCode: z.string().regex(/^AC-\d{4}$/),
  accountName: z.string().min(1).max(160),
  debit: z.number().nonnegative().finite().default(0),
  credit: z.number().nonnegative().finite().default(0),
});

export const journalEntrySchema = z.object({
  code: z.string().regex(/^GL-\d{4}$/),
  date: z.string().datetime(),
  referenceType: z.string().max(40).optional(),
  referenceCode: z.string().max(40).optional(),
  entries: z.array(journalEntryLineSchema).min(2),
  status: journalEntryStatusSchema,
  memo: z.string().max(2_000),
  postedAt: z.string().datetime().nullable().optional(),
  createdBy: z.string().max(120).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createJournalEntryInputSchema = z.object({
  date: z.string().datetime().optional(),
  referenceType: z.string().trim().max(40).optional(),
  referenceCode: z.string().trim().max(40).optional(),
  memo: z.string().trim().min(1).max(2_000),
  entries: z
    .array(
      z.object({
        accountCode: z.string().regex(/^AC-\d{4}$/),
        debit: z.coerce.number().nonnegative().finite().default(0),
        credit: z.coerce.number().nonnegative().finite().default(0),
      }),
    )
    .min(2)
    .max(50)
    .refine((entries) => {
      const debits = entries.reduce((sum, entry) => sum + entry.debit, 0);
      const credits = entries.reduce((sum, entry) => sum + entry.credit, 0);
      return Math.abs(debits - credits) < 0.001;
    }, "Total debits must equal total credits"),
});

export const updateJournalEntryInputSchema = createJournalEntryInputSchema.partial();

export const journalEntryListQuerySchema = offsetPaginationSchema.merge(searchSchema).merge(sortSchema).extend({
  status: journalEntryStatusSchema.optional(),
});

export const journalEntryListResponseSchema = z.object({
  items: z.array(journalEntrySchema),
  meta: z.object({ total: z.number().int().nonnegative(), page: z.number().int().positive(), pageSize: z.number().int().positive() }),
});

export type JournalEntryStatus = z.infer<typeof journalEntryStatusSchema>;
export type JournalEntryLine = z.infer<typeof journalEntryLineSchema>;
export type JournalEntry = z.infer<typeof journalEntrySchema>;
export type CreateJournalEntryInput = z.infer<typeof createJournalEntryInputSchema>;
export type UpdateJournalEntryInput = z.infer<typeof updateJournalEntryInputSchema>;
export type JournalEntryListQuery = z.infer<typeof journalEntryListQuerySchema>;
export type JournalEntryListResponse = z.infer<typeof journalEntryListResponseSchema>;

export const trialBalanceRowSchema = z.object({
  accountCode: z.string().min(1).max(40),
  name: z.string().min(1).max(160),
  type: accountTypeSchema,
  debit: z.number().finite(),
  credit: z.number().finite(),
  balance: z.number().finite(),
});

export const trialBalanceSchema = z.object({
  rows: z.array(trialBalanceRowSchema),
  totalDebit: z.number().finite(),
  totalCredit: z.number().finite(),
  generatedAt: z.string().datetime(),
});

export type TrialBalanceRow = z.infer<typeof trialBalanceRowSchema>;
export type TrialBalance = z.infer<typeof trialBalanceSchema>;

export const ledgerMovementSchema = z.object({
  date: z.string().datetime(),
  entryCode: z.string().min(1).max(40),
  memo: z.string().min(1).max(2_000),
  debit: z.number().finite(),
  credit: z.number().finite(),
  balance: z.number().finite(),
});

export const ledgerSchema = z.object({
  accountCode: z.string().min(1).max(40),
  name: z.string().min(1).max(160),
  openingBalance: z.number().finite(),
  movements: z.array(ledgerMovementSchema),
  closingBalance: z.number().finite(),
});

export type LedgerMovement = z.infer<typeof ledgerMovementSchema>;
export type Ledger = z.infer<typeof ledgerSchema>;

export const accountingOverviewSchema = z.object({
  asOf: z.string().datetime(),
  kpis: z.array(financeKpiSchema),
  accountsByType: z.array(
    z.object({ type: accountTypeSchema, count: z.number().int().nonnegative(), balance: z.number().finite() }),
  ),
  recentEntries: z.array(journalEntrySchema).max(8),
});

export type AccountingOverview = z.infer<typeof accountingOverviewSchema>;
