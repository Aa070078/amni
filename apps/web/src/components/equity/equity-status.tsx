import type { BadgeProps } from "@amni/ui";
import {
  ROUND_STATUSES,
  ROUND_TYPES,
  SHAREHOLDER_TYPES,
  type RoundStatus,
  type RoundType,
  type ShareClassStatus,
  type ShareholderType,
} from "@amni/shared";
import { Badge } from "@amni/ui";

const SHAREHOLDER_VARIANT: Record<ShareholderType, BadgeProps["variant"]> = {
  founder: "default",
  investor: "success",
  employee: "secondary",
  other: "outline",
};

export function ShareholderTypeBadge({ type }: { type: ShareholderType }) {
  const label = SHAREHOLDER_TYPES.find((entry) => entry.value === type)?.label ?? type;
  return <Badge variant={SHAREHOLDER_VARIANT[type]}>{label}</Badge>;
}

export function ShareClassStatusBadge({ status }: { status: ShareClassStatus }) {
  return <Badge variant={status === "active" ? "success" : "outline"}>{status === "active" ? "Active" : "Archived"}</Badge>;
}

const ROUND_TYPE_VARIANT: Record<RoundType, BadgeProps["variant"]> = {
  pre_seed: "secondary",
  seed: "default",
  series_a: "success",
  series_b: "success",
  series_c: "success",
  note: "outline",
};

export function RoundTypeBadge({ type }: { type: RoundType }) {
  const label = ROUND_TYPES.find((entry) => entry.value === type)?.label ?? type;
  return <Badge variant={ROUND_TYPE_VARIANT[type]}>{label}</Badge>;
}

const ROUND_STATUS_VARIANT: Record<RoundStatus, BadgeProps["variant"]> = {
  planned: "secondary",
  announced: "warning",
  closed: "success",
};

export function RoundStatusBadge({ status }: { status: RoundStatus }) {
  const label = ROUND_STATUSES.find((entry) => entry.value === status)?.label ?? status;
  return <Badge variant={ROUND_STATUS_VARIANT[status]}>{label}</Badge>;
}
