import { z } from "zod";

export const tenantStatusSchema = z.enum([
  "CREATING",
  "PROVISIONING",
  "CONFIGURING",
  "VALIDATING",
  "ACTIVE",
  "SUSPENDED",
  "RESUMING",
  "ARCHIVED",
  "FAILED",
]);

export const planTierSchema = z.enum(["trial", "starter", "growth", "scale"]);

export const provisioningJobTypeSchema = z.enum([
  "PROVISION",
  "DEACTIVATE",
  "SUSPEND",
  "RESUME",
  "UPDATE_CONFIG",
  "BACKUP",
  "RESTORE",
]);

export const provisioningJobStateSchema = z.enum([
  "CREATED",
  "QUEUED",
  "PROVISIONING",
  "CONFIGURING",
  "VALIDATING",
  "READY",
  "ACTIVE",
  "PROVISIONING_FAILED",
  "CONFIGURATION_FAILED",
  "VALIDATION_FAILED",
  "CANCELLED",
]);

export const provisioningStepSchema = z.object({
  key: z.string(),
  status: z.enum(["pending", "running", "done", "failed", "skipped"]),
  startedAt: z.string().datetime().optional(),
  finishedAt: z.string().datetime().optional(),
  error: z.string().optional(),
});

export const tenantHealthSchema = z.enum(["UNKNOWN", "HEALTHY", "DEGRADED", "UNREACHABLE"]);

export type TenantStatus = z.infer<typeof tenantStatusSchema>;
export type PlanTier = z.infer<typeof planTierSchema>;
export type ProvisioningJobType = z.infer<typeof provisioningJobTypeSchema>;
export type ProvisioningJobState = z.infer<typeof provisioningJobStateSchema>;
export type ProvisioningStep = z.infer<typeof provisioningStepSchema>;
export type TenantHealth = z.infer<typeof tenantHealthSchema>;
