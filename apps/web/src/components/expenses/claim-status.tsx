import type { BadgeProps } from "@amni/ui";
import { EXPENSE_CLAIM_STATUSES, type ExpenseClaimStatus, type ExpenseCategoryRecordStatus } from "@amni/shared";
import { Badge } from "@amni/ui";

const CLAIM_VARIANT: Record<ExpenseClaimStatus, BadgeProps["variant"]> = {
  draft: "secondary",
  submitted: "warning",
  approved: "default",
  rejected: "destructive",
  paid: "success",
};

export function ExpenseClaimStatusBadge({ status }: { status: ExpenseClaimStatus }) {
  const label = EXPENSE_CLAIM_STATUSES.find((entry) => entry.value === status)?.label ?? status;
  return <Badge variant={CLAIM_VARIANT[status]}>{label}</Badge>;
}

export function ExpenseCategoryStatusBadge({ status }: { status: ExpenseCategoryRecordStatus }) {
  return (
    <Badge variant={status === "active" ? "success" : "outline"}>{status === "active" ? "Active" : "Archived"}</Badge>
  );
}
