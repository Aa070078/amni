import type { BadgeProps } from "@amni/ui";
import { ACCOUNT_TYPES, JOURNAL_ENTRY_STATUSES, type AccountType, type JournalEntryStatus } from "@amni/shared";
import { Badge } from "@amni/ui";

export function AccountTypeBadge({ type }: { type: AccountType }) {
  const variant: Record<AccountType, BadgeProps["variant"]> = {
    asset: "default",
    liability: "warning",
    equity: "secondary",
    income: "success",
    expense: "outline",
  };
  const label = ACCOUNT_TYPES.find((entry) => entry.value === type)?.label ?? type;
  return <Badge variant={variant[type]}>{label}</Badge>;
}

export function JournalEntryStatusBadge({ status }: { status: JournalEntryStatus }) {
  const variant: Record<JournalEntryStatus, BadgeProps["variant"]> = {
    draft: "secondary",
    posted: "success",
    reversed: "outline",
  };
  const label = JOURNAL_ENTRY_STATUSES.find((entry) => entry.value === status)?.label ?? status;
  return <Badge variant={variant[status]}>{label}</Badge>;
}
