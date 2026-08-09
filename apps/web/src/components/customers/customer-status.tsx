"use client";

import type { CustomerStatus } from "@amni/shared";
import { Badge, cn, type BadgeProps } from "@amni/ui";

const CUSTOMER_STATUS_META: Record<CustomerStatus, { variant: BadgeProps["variant"]; dot: string }> = {
  active: { variant: "success", dot: "bg-success" },
  inactive: { variant: "secondary", dot: "bg-foreground/50" },
};

const CUSTOMER_STATUS_LABELS: Record<CustomerStatus, string> = {
  active: "Active",
  inactive: "Inactive",
};

export function customerStatusLabel(status: CustomerStatus): string {
  return CUSTOMER_STATUS_LABELS[status];
}

export function customerStatusMeta(status: CustomerStatus) {
  return { label: customerStatusLabel(status), ...CUSTOMER_STATUS_META[status] };
}

export function CustomerStatusBadge({ status, className }: { status: CustomerStatus; className?: string }) {
  const meta = customerStatusMeta(status);
  return (
    <Badge variant={meta.variant} className={cn("gap-1.5", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} aria-hidden="true" />
      {meta.label}
    </Badge>
  );
}
