import { z } from "zod";

import { offsetPaginationSchema, pageSchema, searchSchema } from "../pagination.js";
import {
  planTierSchema,
  provisioningJobStateSchema,
  tenantHealthSchema,
  tenantStatusSchema,
} from "./tenant.js";

export const subscriptionStatusSchema = z.enum(["TRIAL", "ACTIVE", "PAST_DUE", "CANCELLED", "EXPIRED"]);
export const platformRoleSchema = z.enum(["OWNER", "ADMIN", "MEMBER"]);

export const adminTenantSummarySchema = z.object({
  id: z.string().uuid(),
  companyName: z.string(),
  companySlug: z.string(),
  companyStatus: z.enum(["ONBOARDING", "READY", "ARCHIVED"]),
  siteName: z.string(),
  siteUrl: z.string(),
  status: tenantStatusSchema,
  planTier: planTierSchema,
  erpnextVersion: z.string(),
  hrmsInstalled: z.boolean(),
  region: z.string(),
  subscriptionStatus: subscriptionStatusSchema.nullable().optional(),
  trialEndsAt: z.string().datetime().nullable().optional(),
  memberCount: z.number().int().nonnegative(),
  ownerEmail: z.string().nullable().optional(),
  health: tenantHealthSchema.nullable().optional(),
  createdAt: z.string().datetime(),
});

export const adminTenantListQuerySchema = offsetPaginationSchema.merge(searchSchema).extend({
  status: tenantStatusSchema.optional(),
});

export const adminTenantListResponseSchema = pageSchema(adminTenantSummarySchema);

export const adminTenantMemberSchema = z.object({
  id: z.string().uuid(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string().nullable(),
  platformRole: platformRoleSchema,
  createdAt: z.string().datetime(),
});

export const adminProvisioningJobSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["PROVISION", "DEACTIVATE", "SUSPEND", "RESUME", "UPDATE_CONFIG", "BACKUP", "RESTORE"]),
  state: provisioningJobStateSchema,
  attempts: z.number().int().nonnegative(),
  maxAttempts: z.number().int().positive(),
  steps: z.array(z.record(z.string(), z.unknown())),
  logs: z.array(z.record(z.string(), z.unknown())),
  lastError: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  startedAt: z.string().datetime().nullable().optional(),
  finishedAt: z.string().datetime().nullable().optional(),
});

export const adminSubscriptionSchema = z.object({
  status: subscriptionStatusSchema,
  planName: z.string(),
  planTier: planTierSchema,
  startsAt: z.string().datetime(),
  trialEndsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  cancelledAt: z.string().datetime().nullable().optional(),
});

export const adminErpInstanceSchema = z.object({
  host: z.string(),
  cluster: z.string(),
  capacityGroup: z.string(),
  health: tenantHealthSchema,
  lastHealthCheckAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
});

export const adminTenantDetailSchema = adminTenantSummarySchema.extend({
  industry: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  members: z.array(adminTenantMemberSchema),
  provisioningJobs: z.array(adminProvisioningJobSchema),
  subscription: adminSubscriptionSchema.nullable().optional(),
  erpInstance: adminErpInstanceSchema.nullable().optional(),
});

export const adminSummarySchema = z.object({
  totalUsers: z.number().int().nonnegative(),
  totalCompanies: z.number().int().nonnegative(),
  totalTenants: z.number().int().nonnegative(),
  tenantsByStatus: z.record(z.string(), z.number().int().nonnegative()),
  tenantsByTier: z.record(z.string(), z.number().int().nonnegative()),
  activeSubscriptions: z.number().int().nonnegative(),
  trialsExpiringSoon: z.number().int().nonnegative(),
  provisioningFailures: z.number().int().nonnegative(),
  recentTenants: z.array(adminTenantSummarySchema),
});

export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;
export type AdminMemberRole = z.infer<typeof platformRoleSchema>;
export type AdminTenantSummary = z.infer<typeof adminTenantSummarySchema>;
export type AdminTenantListQuery = z.infer<typeof adminTenantListQuerySchema>;
export type AdminTenantListResponse = z.infer<typeof adminTenantListResponseSchema>;
export type AdminTenantMember = z.infer<typeof adminTenantMemberSchema>;
export type AdminProvisioningJob = z.infer<typeof adminProvisioningJobSchema>;
export type AdminSubscription = z.infer<typeof adminSubscriptionSchema>;
export type AdminErpInstance = z.infer<typeof adminErpInstanceSchema>;
export type AdminTenantDetail = z.infer<typeof adminTenantDetailSchema>;
export type AdminSummary = z.infer<typeof adminSummarySchema>;
