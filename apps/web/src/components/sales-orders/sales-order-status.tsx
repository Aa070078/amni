"use client";

import { SALES_ORDER_STATUSES, type SalesOrderStatus } from "@amni/shared";
import { Badge, cn, type BadgeProps } from "@amni/ui";

const SALES_ORDER_STATUS_META: Record<
  SalesOrderStatus,
  { variant: BadgeProps["variant"]; dot: string }
> = {
  draft: { variant: "outline", dot: "bg-muted-foreground/60" },
  submitted: { variant: "secondary", dot: "bg-foreground/50" },
  partially_delivered: { variant: "warning", dot: "bg-warning" },
  delivered: { variant: "success", dot: "bg-success" },
  completed: { variant: "default", dot: "bg-primary-foreground/70" },
  cancelled: { variant: "outline", dot: "bg-destructive/70" },
};

export function salesOrderStatusLabel(status: SalesOrderStatus): string {
  return SALES_ORDER_STATUSES.find((entry) => entry.value === status)?.label ?? status;
}

export function salesOrderStatusMeta(status: SalesOrderStatus) {
  return { label: salesOrderStatusLabel(status), ...SALES_ORDER_STATUS_META[status] };
}

export function SalesOrderStatusBadge({ status, className }: { status: SalesOrderStatus; className?: string }) {
  const meta = salesOrderStatusMeta(status);
  return (
    <Badge variant={meta.variant} className={cn("gap-1.5", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} aria-hidden="true" />
      {meta.label}
    </Badge>
  );
}
