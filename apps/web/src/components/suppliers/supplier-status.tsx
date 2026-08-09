"use client";

import { SUPPLIER_STATUSES, type SupplierStatus } from "@amni/shared";
import { Badge, cn, type BadgeProps } from "@amni/ui";

const SUPPLIER_STATUS_META: Record<SupplierStatus, { variant: BadgeProps["variant"]; dot: string }> = {
  active: { variant: "success", dot: "bg-success" },
  inactive: { variant: "secondary", dot: "bg-foreground/50" },
};

export function supplierStatusLabel(status: SupplierStatus): string {
  return SUPPLIER_STATUSES.find((entry) => entry.value === status)?.label ?? status;
}

export function supplierStatusMeta(status: SupplierStatus) {
  return { label: supplierStatusLabel(status), ...SUPPLIER_STATUS_META[status] };
}

export function SupplierStatusBadge({ status, className }: { status: SupplierStatus; className?: string }) {
  const meta = supplierStatusMeta(status);
  return (
    <Badge variant={meta.variant} className={cn("gap-1.5", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} aria-hidden="true" />
      {meta.label}
    </Badge>
  );
}
