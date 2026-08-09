import type { BadgeProps } from "@amni/ui";
import {
  ESG_METRIC_STATUSES,
  ESG_PILLARS,
  type BoardMemberIndependence,
  type EsgMetricStatus,
  type EsgPillar,
  type EsgPolicyStatus,
  type EsgReportStatus,
} from "@amni/shared";
import { Badge } from "@amni/ui";

const PILLAR_VARIANT: Record<EsgPillar, BadgeProps["variant"]> = {
  environmental: "success",
  social: "default",
  governance: "secondary",
};

export function EsgPillarBadge({ pillar }: { pillar: EsgPillar }) {
  const label = ESG_PILLARS.find((entry) => entry.value === pillar)?.label ?? pillar;
  return <Badge variant={PILLAR_VARIANT[pillar]}>{label}</Badge>;
}

const METRIC_STATUS_VARIANT: Record<EsgMetricStatus, BadgeProps["variant"]> = {
  on_track: "success",
  behind: "destructive",
  na: "outline",
};

export function EsgMetricStatusBadge({ status }: { status: EsgMetricStatus }) {
  const label = ESG_METRIC_STATUSES.find((entry) => entry.value === status)?.label ?? status;
  return <Badge variant={METRIC_STATUS_VARIANT[status]}>{label}</Badge>;
}

const POLICY_STATUS_VARIANT: Record<EsgPolicyStatus, BadgeProps["variant"]> = {
  active: "success",
  under_review: "warning",
  draft: "secondary",
};

export function EsgPolicyStatusBadge({ status }: { status: EsgPolicyStatus }) {
  const label =
    status === "active"
      ? "Active"
      : status === "under_review"
        ? "Under review"
        : "Draft";
  return <Badge variant={POLICY_STATUS_VARIANT[status]}>{label}</Badge>;
}

const INDEPENDENCE_VARIANT: Record<BoardMemberIndependence, BadgeProps["variant"]> = {
  executive: "default",
  non_executive: "secondary",
  independent: "success",
};

export function BoardMemberIndependenceBadge({ independence }: { independence: BoardMemberIndependence }) {
  const label =
    independence === "executive"
      ? "Executive"
      : independence === "non_executive"
        ? "Non-executive"
        : "Independent";
  return <Badge variant={INDEPENDENCE_VARIANT[independence]}>{label}</Badge>;
}

export function EsgReportStatusBadge({ status }: { status: EsgReportStatus }) {
  return <Badge variant={status === "published" ? "success" : "secondary"}>{status === "published" ? "Published" : "Draft"}</Badge>;
}
