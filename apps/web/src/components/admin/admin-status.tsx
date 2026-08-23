import type { BadgeProps } from "@amni/ui";
import { Badge } from "@amni/ui";
import type {
  PlanTier,
  ProvisioningJobState,
  SubscriptionStatus,
  TenantHealth,
  TenantStatus,
} from "@amni/shared";

export const TENANT_STATUS_LABELS: Record<TenantStatus, string> = {
  CREATING: "Creating",
  PROVISIONING: "Provisioning",
  CONFIGURING: "Configuring",
  VALIDATING: "Validating",
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  RESUMING: "Resuming",
  ARCHIVED: "Archived",
  FAILED: "Failed",
};

export const TENANT_STATUS_VARIANTS: Record<TenantStatus, BadgeProps["variant"]> = {
  CREATING: "secondary",
  PROVISIONING: "secondary",
  CONFIGURING: "secondary",
  VALIDATING: "secondary",
  ACTIVE: "success",
  SUSPENDED: "outline",
  RESUMING: "outline",
  ARCHIVED: "secondary",
  FAILED: "destructive",
};

export const PLAN_TIER_LABELS: Record<PlanTier, string> = {
  trial: "Trial",
  starter: "Starter",
  growth: "Growth",
  scale: "Scale",
};

export const PLAN_TIER_VARIANTS: Record<PlanTier, BadgeProps["variant"]> = {
  trial: "outline",
  starter: "secondary",
  growth: "default",
  scale: "default",
};

export const HEALTH_VARIANTS: Record<TenantHealth, BadgeProps["variant"]> = {
  UNKNOWN: "outline",
  HEALTHY: "success",
  DEGRADED: "secondary",
  UNREACHABLE: "destructive",
};

export const SUBSCRIPTION_VARIANTS: Record<SubscriptionStatus, BadgeProps["variant"]> = {
  TRIAL: "outline",
  ACTIVE: "success",
  PAST_DUE: "secondary",
  CANCELLED: "secondary",
  EXPIRED: "destructive",
};

const FAILED_STATES: ProvisioningJobState[] = [
  "PROVISIONING_FAILED",
  "CONFIGURATION_FAILED",
  "VALIDATION_FAILED",
];

export function TenantStatusBadge({ status }: { status: TenantStatus }) {
  return <Badge variant={TENANT_STATUS_VARIANTS[status]}>{TENANT_STATUS_LABELS[status]}</Badge>;
}

export function PlanTierBadge({ tier }: { tier: PlanTier }) {
  return <Badge variant={PLAN_TIER_VARIANTS[tier]}>{PLAN_TIER_LABELS[tier]}</Badge>;
}

export function HealthBadge({ health }: { health: TenantHealth }) {
  return <Badge variant={HEALTH_VARIANTS[health]}>{health.toLowerCase()}</Badge>;
}

export function SubscriptionStatusBadge({ status }: { status: SubscriptionStatus }) {
  return <Badge variant={SUBSCRIPTION_VARIANTS[status]}>{status.replace("_", " ").toLowerCase()}</Badge>;
}

export function ProvisioningJobStateBadge({ state }: { state: ProvisioningJobState }) {
  const variant: BadgeProps["variant"] = FAILED_STATES.includes(state)
    ? "destructive"
    : state === "ACTIVE" || state === "READY"
      ? "success"
      : state === "CANCELLED"
        ? "outline"
        : "secondary";
  return <Badge variant={variant}>{state.replace("_", " ").toLowerCase()}</Badge>;
}
