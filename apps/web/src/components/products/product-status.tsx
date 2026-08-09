"use client";

import { PRODUCT_STATUSES, type ProductStatus } from "@amni/shared";
import { Badge, cn, type BadgeProps } from "@amni/ui";

export const PRODUCT_CATEGORIES = ["furniture", "lighting", "office", "materials"] as const;

export const PRODUCT_UNITS = ["pcs", "box", "pack", "roll", "set", "m", "m2", "kg"] as const;

const PRODUCT_STATUS_META: Record<
  ProductStatus,
  { variant: BadgeProps["variant"]; dot: string }
> = {
  active: { variant: "success", dot: "bg-success" },
  draft: { variant: "secondary", dot: "bg-muted-foreground/60" },
  disabled: { variant: "outline", dot: "bg-destructive/60" },
};

export function productStatusLabel(status: ProductStatus): string {
  return PRODUCT_STATUSES.find((entry) => entry.value === status)?.label ?? status;
}

export function productStatusMeta(status: ProductStatus) {
  return { label: productStatusLabel(status), ...PRODUCT_STATUS_META[status] };
}

export function ProductStatusBadge({ status, className }: { status: ProductStatus; className?: string }) {
  const meta = productStatusMeta(status);
  return (
    <Badge variant={meta.variant} className={cn("gap-1.5", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} aria-hidden="true" />
      {meta.label}
    </Badge>
  );
}
