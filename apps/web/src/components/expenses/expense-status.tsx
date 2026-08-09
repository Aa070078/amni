"use client";

import { EXPENSE_STATUSES, type ExpenseStatus } from "@amni/shared";
import { Badge, cn, type BadgeProps } from "@amni/ui";

const EXPENSE_STATUS_META: Record<ExpenseStatus, { variant: BadgeProps["variant"]; dot: string }> = {
  draft: { variant: "outline", dot: "bg-muted-foreground/60" },
  submitted: { variant: "secondary", dot: "bg-foreground/50" },
  approved: { variant: "success", dot: "bg-success" },
  rejected: { variant: "destructive", dot: "bg-destructive" },
  paid: { variant: "default", dot: "bg-primary-foreground/70" },
};

export function expenseStatusLabel(status: ExpenseStatus): string {
  return EXPENSE_STATUSES.find((entry) => entry.value === status)?.label ?? status;
}

export function expenseStatusMeta(status: ExpenseStatus) {
  return { label: expenseStatusLabel(status), ...EXPENSE_STATUS_META[status] };
}

export function ExpenseStatusBadge({ status, className }: { status: ExpenseStatus; className?: string }) {
  const meta = expenseStatusMeta(status);
  return (
    <Badge variant={meta.variant} className={cn("gap-1.5", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} aria-hidden="true" />
      {meta.label}
    </Badge>
  );
}
