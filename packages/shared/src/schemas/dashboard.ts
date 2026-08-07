import { z } from "zod";
import { ProductRole } from "../constants.js";
import { currencySchema } from "./company.js";

export const kpiTrendSchema = z.enum(["up", "down", "flat"]);

export const kpiFormatSchema = z.enum(["currency", "number", "percent"]);

export const dashboardKpiSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(80),
  value: z.number().finite(),
  format: kpiFormatSchema,
  currency: currencySchema.optional(),
  delta: z.number().finite().optional(),
  deltaLabel: z.string().max(80).optional(),
  trend: kpiTrendSchema.optional(),
  hint: z.string().max(120).optional(),
  sparkline: z.array(z.number().finite()).min(2).max(24).optional(),
});

export const dashboardSeriesPointSchema = z.object({
  label: z.string().min(1).max(32),
  value: z.number().finite(),
});

export const dashboardArBucketSchema = z.object({
  label: z.string().min(1).max(32),
  value: z.number().finite(),
});

export const dashboardAlertSchema = z.object({
  id: z.string().min(1).max(64),
  severity: z.enum(["critical", "warning", "info"]),
  title: z.string().min(1).max(120),
  description: z.string().max(240).optional(),
  href: z.string().max(500).optional(),
});

export const activityItemSchema = z.object({
  id: z.string().min(1).max(64),
  action: z.string().min(1).max(120),
  target: z.string().max(120).optional(),
  href: z.string().max(500).optional(),
  actor: z.string().max(120).optional(),
  time: z.string().datetime(),
});

export const quickActionSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(80),
  description: z.string().max(160).optional(),
  href: z.string().max(500),
  roles: z.array(z.nativeEnum(ProductRole)).optional(),
});

export const dashboardOverviewSchema = z.object({
  asOf: z.string().datetime(),
  role: z.nativeEnum(ProductRole),
  kpis: z.array(dashboardKpiSchema),
  quickActions: z.array(quickActionSchema),
  revenueTrend: z.array(dashboardSeriesPointSchema).optional(),
  cashTrend: z.array(dashboardSeriesPointSchema).optional(),
  arAging: z.array(dashboardArBucketSchema).optional(),
});

export const dashboardAlertsSchema = z.object({
  alerts: z.array(dashboardAlertSchema),
});

export const dashboardActivitySchema = z.object({
  activity: z.array(activityItemSchema),
});

export const dashboardOverviewQuerySchema = z.object({
  role: z.nativeEnum(ProductRole).optional(),
});

export type KpiTrend = z.infer<typeof kpiTrendSchema>;
export type KpiFormat = z.infer<typeof kpiFormatSchema>;
export type DashboardKpi = z.infer<typeof dashboardKpiSchema>;
export type DashboardSeriesPoint = z.infer<typeof dashboardSeriesPointSchema>;
export type DashboardArBucket = z.infer<typeof dashboardArBucketSchema>;
export type DashboardAlert = z.infer<typeof dashboardAlertSchema>;
export type ActivityItem = z.infer<typeof activityItemSchema>;
export type QuickAction = z.infer<typeof quickActionSchema>;
export type DashboardOverview = z.infer<typeof dashboardOverviewSchema>;
export type DashboardAlerts = z.infer<typeof dashboardAlertsSchema>;
export type DashboardActivity = z.infer<typeof dashboardActivitySchema>;
