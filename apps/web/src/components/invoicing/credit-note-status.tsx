import type { BadgeProps } from "@amni/ui";
import { CREDIT_NOTE_STATUSES, type CreditNoteStatus } from "@amni/shared";
import { Badge } from "@amni/ui";

const VARIANT: Record<CreditNoteStatus, BadgeProps["variant"]> = {
  draft: "secondary",
  issued: "success",
  applied: "default",
  void: "outline",
};

export function CreditNoteStatusBadge({ status }: { status: CreditNoteStatus }) {
  const label = CREDIT_NOTE_STATUSES.find((entry) => entry.value === status)?.label ?? status;
  return <Badge variant={VARIANT[status]}>{label}</Badge>;
}
