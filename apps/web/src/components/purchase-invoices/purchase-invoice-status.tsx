"use client";

import { PURCHASE_INVOICE_STATUSES, type PurchaseInvoiceStatus } from "@amni/shared";
import { Badge, cn, type BadgeProps } from "@amni/ui";

const PURCHASE_INVOICE_STATUS_META: Record<
  PurchaseInvoiceStatus,
  { variant: BadgeProps["variant"]; dot: string }
> = {
  draft: { variant: "outline", dot: "bg-muted-foreground/60" },
  submitted: { variant: "secondary", dot: "bg-foreground/50" },
  partially_paid: { variant: "warning", dot: "bg-warning" },
  paid: { variant: "success", dot: "bg-success" },
  overdue: { variant: "destructive", dot: "bg-destructive" },
  cancelled: { variant: "outline", dot: "bg-destructive/70" },
};

export function purchaseInvoiceStatusLabel(status: PurchaseInvoiceStatus): string {
  return PURCHASE_INVOICE_STATUSES.find((entry) => entry.value === status)?.label ?? status;
}

export function purchaseInvoiceStatusMeta(status: PurchaseInvoiceStatus) {
  return { label: purchaseInvoiceStatusLabel(status), ...PURCHASE_INVOICE_STATUS_META[status] };
}

export function PurchaseInvoiceStatusBadge({ status, className }: { status: PurchaseInvoiceStatus; className?: string }) {
  const meta = purchaseInvoiceStatusMeta(status);
  return (
    <Badge variant={meta.variant} className={cn("gap-1.5", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} aria-hidden="true" />
      {meta.label}
    </Badge>
  );
}
