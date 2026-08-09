"use client";

import { WAREHOUSE_STATUSES, type WarehouseStatus } from "@amni/shared";
import { Badge, cn, type BadgeProps } from "@amni/ui";

const WAREHOUSE_STATUS_META: Record<WarehouseStatus, { variant: BadgeProps["variant"]; dot: string }> = {
  active: { variant: "success", dot: "bg-success" },
  inactive: { variant: "secondary", dot: "bg-muted-foreground/60" },
};

export function warehouseStatusLabel(status: WarehouseStatus): string {
  return WAREHOUSE_STATUSES.find((entry) => entry.value === status)?.label ?? status;
}

export function warehouseStatusMeta(status: WarehouseStatus) {
  return { label: warehouseStatusLabel(status), ...WAREHOUSE_STATUS_META[status] };
}

export function WarehouseStatusBadge({ status, className }: { status: WarehouseStatus; className?: string }) {
  const meta = warehouseStatusMeta(status);
  return (
    <Badge variant={meta.variant} className={cn("gap-1.5", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} aria-hidden="true" />
      {meta.label}
    </Badge>
  );
}
