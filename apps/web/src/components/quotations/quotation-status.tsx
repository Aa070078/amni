"use client";

import { QUOTATION_STATUSES, type QuotationStatus } from "@amni/shared";
import { Badge, cn, type BadgeProps } from "@amni/ui";

const QUOTATION_STATUS_META: Record<QuotationStatus, { variant: BadgeProps["variant"]; dot: string }> = {
  draft: { variant: "outline", dot: "bg-muted-foreground/60" },
  sent: { variant: "warning", dot: "bg-warning" },
  accepted: { variant: "success", dot: "bg-success" },
  rejected: { variant: "destructive", dot: "bg-destructive" },
  expired: { variant: "secondary", dot: "bg-foreground/50" },
  converted: { variant: "default", dot: "bg-primary" },
};

export function quotationStatusLabel(status: QuotationStatus): string {
  return QUOTATION_STATUSES.find((entry) => entry.value === status)?.label ?? status;
}

export function quotationStatusMeta(status: QuotationStatus) {
  return { label: quotationStatusLabel(status), ...QUOTATION_STATUS_META[status] };
}

export function QuotationStatusBadge({ status, className }: { status: QuotationStatus; className?: string }) {
  const meta = quotationStatusMeta(status);
  return (
    <Badge variant={meta.variant} className={cn("gap-1.5", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} aria-hidden="true" />
      {meta.label}
    </Badge>
  );
}
