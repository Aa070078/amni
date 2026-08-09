"use client";

import { SALES_INVOICE_STATUSES, type SalesInvoiceStatus } from "@amni/shared";
import { Badge, cn, type BadgeProps } from "@amni/ui";

const SALES_INVOICE_STATUS_META: Record<
  SalesInvoiceStatus,
  { variant: BadgeProps["variant"]; dot: string }
> = {
  draft: { variant: "outline", dot: "bg-muted-foreground/60" },
  submitted: { variant: "secondary", dot: "bg-foreground/50" },
  partially_paid: { variant: "warning", dot: "bg-warning" },
  paid: { variant: "success", dot: "bg-success" },
  overdue: { variant: "destructive", dot: "bg-destructive" },
  cancelled: { variant: "outline", dot: "bg-destructive/70" },
};

export function salesInvoiceStatusLabel(status: SalesInvoiceStatus): string {
  return SALES_INVOICE_STATUSES.find((entry) => entry.value === status)?.label ?? status;
}

export function salesInvoiceStatusMeta(status: SalesInvoiceStatus) {
  return { label: salesInvoiceStatusLabel(status), ...SALES_INVOICE_STATUS_META[status] };
}

export function SalesInvoiceStatusBadge({ status, className }: { status: SalesInvoiceStatus; className?: string }) {
  const meta = salesInvoiceStatusMeta(status);
  return (
    <Badge variant={meta.variant} className={cn("gap-1.5", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} aria-hidden="true" />
      {meta.label}
    </Badge>
  );
}
