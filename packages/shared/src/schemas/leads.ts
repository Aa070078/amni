import { z } from "zod";
import { emailSchema } from "./auth.js";
import { currencySchema } from "./company.js";
import { offsetPaginationSchema, pageSchema, searchSchema, sortSchema } from "../pagination.js";

export const leadStageSchema = z.enum(["new", "contacted", "qualified", "proposal", "won", "lost"]);

export const leadSourceSchema = z.enum([
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

export const LEAD_STAGES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "proposal", label: "Proposal" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
] as const;

export const LEAD_SOURCES = [
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

export const LEAD_STAGE_PROBABILITY: Record<LeadStage, number> = {
  new: 10,
  contacted: 20,
  qualified: 40,
  proposal: 70,
  won: 100,
  lost: 0,
};

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const leadSchema = z.object({
  code: z.string().regex(/^LD-\d{4}$/),
  company: z.string().min(1).max(120),
  contactName: z.string().min(1).max(120),
  contactEmail: emailSchema,
  contactPhone: z.string().max(40).optional(),
  source: leadSourceSchema,
  stage: leadStageSchema,
  value: z.number().nonnegative().finite(),
  currency: currencySchema,
  probability: z.number().int().min(0).max(100),
  expectedClose: dateOnlySchema.nullable().optional(),
  owner: z.string().min(1).max(120).optional(),
  notes: z.string().max(2_000).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const leadActivitySchema = z.object({
  id: z.string().min(1).max(64),
  action: z.string().min(1).max(200),
  actor: z.string().max(120).optional(),
  time: z.string().datetime(),
});

export const leadDetailSchema = leadSchema.extend({
  activities: z.array(leadActivitySchema),
});

export const leadStageStatSchema = z.object({
  stage: leadStageSchema,
  label: z.string().min(1).max(32),
  count: z.number().int().nonnegative(),
  value: z.number().nonnegative().finite(),
});

export const leadPipelineSchema = z.object({
  stats: z.array(leadStageStatSchema),
  items: z.array(leadSchema),
});

export const createLeadInputSchema = z.object({
  company: z.string().trim().min(1).max(120),
  contactName: z.string().trim().min(1).max(120),
  contactEmail: emailSchema,
  contactPhone: z.string().trim().max(40).optional(),
  source: leadSourceSchema.default("website"),
  stage: leadStageSchema.optional(),
  value: z.coerce.number().nonnegative().finite(),
  currency: currencySchema.default("USD"),
  expectedClose: dateOnlySchema.nullable().optional(),
  owner: z.string().trim().min(1).max(120).optional(),
  notes: z.string().trim().max(2_000).optional(),
});

export const updateLeadInputSchema = createLeadInputSchema.partial();

export const moveLeadStageInputSchema = z.object({
  stage: leadStageSchema,
});

export const leadListQuerySchema = offsetPaginationSchema
  .merge(searchSchema)
  .merge(sortSchema)
  .extend({
    stage: leadStageSchema.optional(),
  });

export const leadPipelineQuerySchema = searchSchema;

export type LeadStage = z.infer<typeof leadStageSchema>;
export type LeadSource = z.infer<typeof leadSourceSchema>;
export type Lead = z.infer<typeof leadSchema>;
export type LeadActivity = z.infer<typeof leadActivitySchema>;
export type LeadDetail = z.infer<typeof leadDetailSchema>;
export type LeadStageStat = z.infer<typeof leadStageStatSchema>;
export type LeadPipeline = z.infer<typeof leadPipelineSchema>;
export type CreateLeadInput = z.infer<typeof createLeadInputSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadInputSchema>;
export type MoveLeadStageInput = z.infer<typeof moveLeadStageInputSchema>;
export type LeadListQuery = z.infer<typeof leadListQuerySchema>;
export type LeadPipelineQuery = z.infer<typeof leadPipelineQuerySchema>;

export const leadListResponseSchema = pageSchema(leadSchema);
export type LeadListResponse = z.infer<typeof leadListResponseSchema>;
