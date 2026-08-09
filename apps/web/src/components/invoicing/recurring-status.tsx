import type { BadgeProps } from "@amni/ui";
import { RECURRING_PROFILE_STATUSES, type RecurringProfileStatus } from "@amni/shared";
import { Badge } from "@amni/ui";

const VARIANT: Record<RecurringProfileStatus, BadgeProps["variant"]> = {
  active: "success",
  paused: "warning",
  ended: "outline",
};

export function RecurringStatusBadge({ status }: { status: RecurringProfileStatus }) {
  const label = RECURRING_PROFILE_STATUSES.find((entry) => entry.value === status)?.label ?? status;
  return <Badge variant={VARIANT[status]}>{label}</Badge>;
}
