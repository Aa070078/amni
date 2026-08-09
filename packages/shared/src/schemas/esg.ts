import { z } from "zod";
import { financeKpiSchema } from "./finance.js";

export const esgPillarSchema = z.enum(["environmental", "social", "governance"]);

export const ESG_PILLARS = [
  { value: "environmental", label: "Environmental" },
  { value: "social", label: "Social" },
  { value: "governance", label: "Governance" },
] as const;

export const esgMetricStatusSchema = z.enum(["on_track", "behind", "na"]);

export const ESG_METRIC_STATUSES = [
  { value: "on_track", label: "On track" },
  { value: "behind", label: "Behind" },
  { value: "na", label: "N/A" },
] as const;

export const esgMetricSchema = z.object({
  code: z.string().min(1).max(64),
  pillar: esgPillarSchema,
  name: z.string().min(1).max(120),
  value: z.number().finite(),
  unit: z.string().min(1).max(40),
  period: z.string().min(1).max(20),
  target: z.number().finite().nullable().optional(),
  status: esgMetricStatusSchema,
  trend: z.enum(["up", "down", "flat"]).optional(),
});

export const esgMetricsListQuerySchema = z.object({
  pillar: esgPillarSchema.optional(),
  status: esgMetricStatusSchema.optional(),
});

export type EsgPillar = z.infer<typeof esgPillarSchema>;
export type EsgMetricStatus = z.infer<typeof esgMetricStatusSchema>;
export type EsgMetric = z.infer<typeof esgMetricSchema>;
export type EsgMetricsListQuery = z.infer<typeof esgMetricsListQuerySchema>;

export const esgPolicyStatusSchema = z.enum(["active", "under_review", "draft"]);

export const esgPolicySchema = z.object({
  code: z.string().regex(/^POL-\d{4}$/),
  name: z.string().min(1).max(160),
  status: esgPolicyStatusSchema,
  lastReviewed: z.string().datetime().nullable().optional(),
  nextReview: z.string().datetime().nullable().optional(),
});

export type EsgPolicyStatus = z.infer<typeof esgPolicyStatusSchema>;
export type EsgPolicy = z.infer<typeof esgPolicySchema>;

export const boardMemberIndependenceSchema = z.enum(["executive", "non_executive", "independent"]);

export const esgBoardMemberSchema = z.object({
  code: z.string().regex(/^BRD-\d{4}$/),
  name: z.string().min(1).max(160),
  role: z.string().min(1).max(120),
  independence: boardMemberIndependenceSchema,
  since: z.string().min(1).max(20),
});

export type BoardMemberIndependence = z.infer<typeof boardMemberIndependenceSchema>;
export type EsgBoardMember = z.infer<typeof esgBoardMemberSchema>;

export const esgReportStatusSchema = z.enum(["draft", "published"]);

export const esgReportSchema = z.object({
  code: z.string().regex(/^ESG-\d{4}$/),
  period: z.string().min(1).max(20),
  status: esgReportStatusSchema,
  pillarScore: z.object({
    environmental: z.number().finite(),
    social: z.number().finite(),
    governance: z.number().finite(),
    overall: z.number().finite(),
  }),
  highlights: z.array(z.string().min(1).max(240)),
  generatedAt: z.string().datetime(),
});

export type EsgReportStatus = z.infer<typeof esgReportStatusSchema>;
export type EsgReport = z.infer<typeof esgReportSchema>;

export const esgOverviewSchema = z.object({
  asOf: z.string().datetime(),
  scores: z.object({
    environmental: z.number().finite(),
    social: z.number().finite(),
    governance: z.number().finite(),
    overall: z.number().finite(),
  }),
  kpis: z.array(financeKpiSchema),
  carbonFootprint: z.number().nonnegative().finite(),
  employees: z.number().int().nonnegative(),
  boardSize: z.number().int().nonnegative(),
  policiesActive: z.number().int().nonnegative(),
  latestReport: esgReportSchema.nullable().optional(),
});

export type EsgOverview = z.infer<typeof esgOverviewSchema>;
