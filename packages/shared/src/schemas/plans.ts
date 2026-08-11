import { z } from "zod";
import { planTierSchema } from "./tenant.js";

export const catalogPlanSchema = z.object({
  code: z.string().min(1).max(40),
  name: z.string().min(1).max(120),
  tier: planTierSchema,
  priceMonthly: z.number().min(0),
  limits: z.record(z.string(), z.unknown()),
  features: z.record(z.string(), z.unknown()),
});

export const plansListResponseSchema = z.object({
  items: z.array(catalogPlanSchema),
});

export type CatalogPlan = z.infer<typeof catalogPlanSchema>;
export type PlansListResponse = z.infer<typeof plansListResponseSchema>;
