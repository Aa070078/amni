import { z } from "zod";
import { emailSchema } from "./auth.js";
import { currencySchema } from "./company.js";
import { offsetPaginationSchema, pageSchema, searchSchema, sortSchema } from "../pagination.js";

export const dealStageSchema = z.enum([
  "qualification",
  "analysis",
  "proposal",
  "negotiation",
  "won",
  "lost",
]);

export const dealSourceSchema = z.enum([
  "website",
  "referral",
  "cold_call",
  "outbound",
  "trade_show",
  "social",
  "email",
  "partner",
  "other",
]);

export const DEAL_STAGES = [
  { value: "qualification", label: "Qualification" },
  { value: "analysis", label: "Analysis" },
  { value: "proposal", label: "Proposal" },
  { value: "negotiation", label: "Negotiation" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
] as const;

export const DEAL_SOURCES = [
  { value: "website", label: "Website" },
  { value: "referral", label: "Referral" },
  { value: "cold_call", label: "Cold call" },
  { value: "outbound", label: "Outbound" },
  { value: "trade_show", label: "Trade show" },
  { value: "social", label: "Social" },
  { value: "email", label: "Email" },
  { value: "partner", label: "Partner" },
  { value: "other", label: "Other" },
] as const;

export const DEAL_STAGE_PROBABILITY: Record<DealStage, number> = {
  qualification: 15,
  analysis: 30,
  proposal: 55,
  negotiation: 80,
  won: 100,
  lost: 0,
};

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const dealSchema = z.object({
  code: z.string().min(1).max(80),
  title: z.string().min(1).max(160),
  company: z.string().min(1).max(120),
  contactName: z.string().min(1).max(120),
  contactEmail: emailSchema,
  contactPhone: z.string().max(40).optional(),
  source: dealSourceSchema,
  stage: dealStageSchema,
  value: z.number().nonnegative().finite(),
  currency: currencySchema,
  probability: z.number().int().min(0).max(100),
  expectedClose: dateOnlySchema.nullable().optional(),
  owner: z.string().min(1).max(120).optional(),
  notes: z.string().max(2_000).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const dealActivitySchema = z.object({
  id: z.string().min(1).max(64),
  action: z.string().min(1).max(200),
  actor: z.string().max(120).optional(),
  time: z.string().datetime(),
});

export const dealDetailSchema = dealSchema.extend({
  activities: z.array(dealActivitySchema),
});

export const dealStageStatSchema = z.object({
  stage: dealStageSchema,
  label: z.string().min(1).max(32),
  count: z.number().int().nonnegative(),
  value: z.number().nonnegative().finite(),
});

export const dealPipelineSchema = z.object({
  stats: z.array(dealStageStatSchema),
  items: z.array(dealSchema),
});

export const createDealInputSchema = z.object({
  title: z.string().trim().min(1).max(160),
  company: z.string().trim().min(1).max(120),
  contactName: z.string().trim().min(1).max(120),
  contactEmail: emailSchema,
  contactPhone: z.string().trim().max(40).optional(),
  source: dealSourceSchema.default("website"),
  stage: dealStageSchema.optional(),
  value: z.coerce.number().nonnegative().finite(),
  currency: currencySchema.default("USD"),
  expectedClose: dateOnlySchema.nullable().optional(),
  owner: z.string().trim().min(1).max(120).optional(),
  notes: z.string().trim().max(2_000).optional(),
});

export const updateDealInputSchema = createDealInputSchema.partial();

export const moveDealStageInputSchema = z.object({
  stage: dealStageSchema,
});

export const dealListQuerySchema = offsetPaginationSchema
  .merge(searchSchema)
  .merge(sortSchema)
  .extend({
    stage: dealStageSchema.optional(),
  });

export const dealPipelineQuerySchema = searchSchema;

export type DealStage = z.infer<typeof dealStageSchema>;
export type DealSource = z.infer<typeof dealSourceSchema>;
export type Deal = z.infer<typeof dealSchema>;
export type DealActivity = z.infer<typeof dealActivitySchema>;
export type DealDetail = z.infer<typeof dealDetailSchema>;
export type DealStageStat = z.infer<typeof dealStageStatSchema>;
export type DealPipeline = z.infer<typeof dealPipelineSchema>;
export type CreateDealInput = z.infer<typeof createDealInputSchema>;
export type UpdateDealInput = z.infer<typeof updateDealInputSchema>;
export type MoveDealStageInput = z.infer<typeof moveDealStageInputSchema>;
export type DealListQuery = z.infer<typeof dealListQuerySchema>;
export type DealPipelineQuery = z.infer<typeof dealPipelineQuerySchema>;

export const dealListResponseSchema = pageSchema(dealSchema);
export type DealListResponse = z.infer<typeof dealListResponseSchema>;
