import { z } from "zod";
import { financeKpiSchema } from "./finance.js";
import { offsetPaginationSchema, searchSchema, sortSchema } from "../pagination.js";

export const shareholderTypeSchema = z.enum(["founder", "investor", "employee", "other"]);

export const SHAREHOLDER_TYPES = [
  { value: "founder", label: "Founder" },
  { value: "investor", label: "Investor" },
  { value: "employee", label: "Employee" },
  { value: "other", label: "Other" },
] as const;

export const shareholderHoldingSchema = z.object({
  classCode: z.string().regex(/^CLS-[A-Z0-9]{4,12}$/),
  shares: z.number().int().nonnegative().finite(),
});

export const shareholderSchema = z.object({
  code: z.string().regex(/^SH-[A-Z0-9]{4,12}$/),
  name: z.string().min(1).max(160),
  type: shareholderTypeSchema,
  email: z.string().email().max(254).optional(),
  totalShares: z.number().int().nonnegative().finite(),
  holdings: z.array(shareholderHoldingSchema),
  investedAmount: z.number().nonnegative().finite().default(0),
  joinedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createShareholderInputSchema = z.object({
  name: z.string().trim().min(1).max(160),
  type: shareholderTypeSchema,
  email: z.string().email().max(254).optional(),
  holdings: z.array(shareholderHoldingSchema).min(1).max(20),
  investedAmount: z.coerce.number().nonnegative().finite().default(0),
  joinedAt: z.string().datetime().optional(),
});

export const updateShareholderInputSchema = createShareholderInputSchema.partial();

export const shareholderListQuerySchema = offsetPaginationSchema.merge(searchSchema).merge(sortSchema).extend({
  type: shareholderTypeSchema.optional(),
});

export const shareholderListResponseSchema = z.object({
  items: z.array(shareholderSchema),
  meta: z.object({ total: z.number().int().nonnegative(), page: z.number().int().positive(), pageSize: z.number().int().positive() }),
});

export type ShareholderType = z.infer<typeof shareholderTypeSchema>;
export type ShareholderHolding = z.infer<typeof shareholderHoldingSchema>;
export type Shareholder = z.infer<typeof shareholderSchema>;
export type CreateShareholderInput = z.infer<typeof createShareholderInputSchema>;
export type UpdateShareholderInput = z.infer<typeof updateShareholderInputSchema>;
export type ShareholderListQuery = z.infer<typeof shareholderListQuerySchema>;
export type ShareholderListResponse = z.infer<typeof shareholderListResponseSchema>;

export const shareClassStatusSchema = z.enum(["active", "archived"]);

export const shareClassSchema = z.object({
  code: z.string().regex(/^CLS-[A-Z0-9]{4,12}$/),
  name: z.string().min(1).max(120),
  totalShares: z.number().int().nonnegative().finite(),
  outstandingShares: z.number().int().nonnegative().finite(),
  pricePerShare: z.number().nonnegative().finite(),
  voting: z.boolean().default(true),
  liquidationPreference: z.number().nonnegative().finite().optional(),
  status: shareClassStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createShareClassInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  totalShares: z.coerce.number().int().nonnegative().finite(),
  outstandingShares: z.coerce.number().int().nonnegative().finite(),
  pricePerShare: z.coerce.number().nonnegative().finite(),
  voting: z.boolean().default(true),
  liquidationPreference: z.coerce.number().nonnegative().finite().optional(),
});

export const updateShareClassInputSchema = createShareClassInputSchema.partial();

export const shareClassListQuerySchema = offsetPaginationSchema.merge(searchSchema).merge(sortSchema).extend({
  status: shareClassStatusSchema.optional(),
});

export const shareClassListResponseSchema = z.object({
  items: z.array(shareClassSchema),
  meta: z.object({ total: z.number().int().nonnegative(), page: z.number().int().positive(), pageSize: z.number().int().positive() }),
});

export type ShareClassStatus = z.infer<typeof shareClassStatusSchema>;
export type ShareClass = z.infer<typeof shareClassSchema>;
export type CreateShareClassInput = z.infer<typeof createShareClassInputSchema>;
export type UpdateShareClassInput = z.infer<typeof updateShareClassInputSchema>;
export type ShareClassListQuery = z.infer<typeof shareClassListQuerySchema>;
export type ShareClassListResponse = z.infer<typeof shareClassListResponseSchema>;

export const roundTypeSchema = z.enum(["pre_seed", "seed", "series_a", "series_b", "series_c", "note"]);

export const ROUND_TYPES = [
  { value: "pre_seed", label: "Pre-seed" },
  { value: "seed", label: "Seed" },
  { value: "series_a", label: "Series A" },
  { value: "series_b", label: "Series B" },
  { value: "series_c", label: "Series C" },
  { value: "note", label: "Convertible note" },
] as const;

export const roundStatusSchema = z.enum(["planned", "announced", "closed"]);

export const ROUND_STATUSES = [
  { value: "planned", label: "Planned" },
  { value: "announced", label: "Announced" },
  { value: "closed", label: "Closed" },
] as const;

export const roundSchema = z.object({
  code: z.string().regex(/^RD-[A-Z0-9]{4,12}$/),
  name: z.string().min(1).max(160),
  type: roundTypeSchema,
  announcedDate: z.string().datetime(),
  closedDate: z.string().datetime().nullable().optional(),
  amountRaised: z.number().nonnegative().finite(),
  preMoney: z.number().nonnegative().finite(),
  postMoney: z.number().nonnegative().finite(),
  sharesIssued: z.number().int().nonnegative().finite(),
  valuation: z.number().nonnegative().finite(),
  investors: z.array(z.string().min(1).max(160)),
  status: roundStatusSchema,
  notes: z.string().max(2_000).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createRoundInputSchema = z.object({
  name: z.string().trim().min(1).max(160),
  type: roundTypeSchema,
  announcedDate: z.string().datetime().optional(),
  closedDate: z.string().datetime().nullable().optional(),
  amountRaised: z.coerce.number().nonnegative().finite(),
  preMoney: z.coerce.number().nonnegative().finite(),
  postMoney: z.coerce.number().nonnegative().finite(),
  sharesIssued: z.coerce.number().int().nonnegative().finite(),
  investors: z.array(z.string().trim().min(1).max(160)).max(50),
  notes: z.string().trim().max(2_000).optional(),
});

export const updateRoundInputSchema = createRoundInputSchema.partial();

export const roundListQuerySchema = offsetPaginationSchema.merge(searchSchema).merge(sortSchema).extend({
  status: roundStatusSchema.optional(),
});

export const roundListResponseSchema = z.object({
  items: z.array(roundSchema),
  meta: z.object({ total: z.number().int().nonnegative(), page: z.number().int().positive(), pageSize: z.number().int().positive() }),
});

export type RoundType = z.infer<typeof roundTypeSchema>;
export type RoundStatus = z.infer<typeof roundStatusSchema>;
export type Round = z.infer<typeof roundSchema>;
export type CreateRoundInput = z.infer<typeof createRoundInputSchema>;
export type UpdateRoundInput = z.infer<typeof updateRoundInputSchema>;
export type RoundListQuery = z.infer<typeof roundListQuerySchema>;
export type RoundListResponse = z.infer<typeof roundListResponseSchema>;

export const capTableRowSchema = z.object({
  shareholderCode: z.string().min(1).max(40),
  name: z.string().min(1).max(160),
  type: shareholderTypeSchema,
  classCode: z.string().min(1).max(40),
  className: z.string().min(1).max(120),
  shares: z.number().int().nonnegative().finite(),
  ownershipPct: z.number().nonnegative().finite(),
  investedAmount: z.number().nonnegative().finite(),
});

export type CapTableRow = z.infer<typeof capTableRowSchema>;

export const equityOverviewSchema = z.object({
  asOf: z.string().datetime(),
  kpis: z.array(financeKpiSchema),
  totalShares: z.number().int().nonnegative().finite(),
  totalInvested: z.number().nonnegative().finite(),
  currentValuation: z.number().nonnegative().finite(),
  investorCount: z.number().int().nonnegative(),
  optionPoolPct: z.number().nonnegative().finite(),
  byClass: z.array(
    z.object({ className: z.string().min(1).max(120), shares: z.number().int().nonnegative().finite(), pct: z.number().finite() }),
  ),
});

export type EquityOverview = z.infer<typeof equityOverviewSchema>;
