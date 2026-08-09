"use client";

import { PURCHASE_ORDER_STATUSES, type PurchaseOrderStatus } from "@amni/shared";
import { Badge, cn, type BadgeProps } from "@amni/ui";

const PURCHASE_ORDER_STATUS_META: Record<
  PurchaseOrderStatus,
  { variant: BadgeProps["variant"]; dot: string }
> = {
  draft: { variant: "outline", dot: "bg-muted-foreground/60" },
  submitted: { variant: "secondary", dot: "bg-foreground/50" },
  partially_received: { variant: "warning", dot: "bg-warning" },
  received: { variant: "success", dot: "bg-success" },
  completed: { variant: "default", dot: "bg-primary-foreground/70" },
  cancelled: { variant: "outline", dot: "bg-destructive/70" },
};

export function purchaseOrderStatusLabel(status: PurchaseOrderStatus): string {
  return PURCHASE_ORDER_STATUSES.find((entry) => entry.value === status)?.label ?? status;
}

export function purchaseOrderStatusMeta(status: PurchaseOrderStatus) {
  return { label: purchaseOrderStatusLabel(status), ...PURCHASE_ORDER_STATUS_META[status] };
}

export function PurchaseOrderStatusBadge({ status, className }: { status: PurchaseOrderStatus; className?: string }) {
  const meta = purchaseOrderStatusMeta(status);
  return (
    <Badge variant={meta.variant} className={cn("gap-1.5", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} aria-hidden="true" />
      {meta.label}
    </Badge>
  );
}
