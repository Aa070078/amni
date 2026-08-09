"use client";

import { MOVEMENT_TYPES, type MovementType } from "@amni/shared";
import { Badge, cn, type BadgeProps } from "@amni/ui";

const MOVEMENT_TYPE_META: Record<MovementType, { variant: BadgeProps["variant"]; dot: string }> = {
  in: { variant: "success", dot: "bg-success" },
  out: { variant: "default", dot: "bg-primary" },
  transfer: { variant: "secondary", dot: "bg-foreground/50" },
  adjust: { variant: "warning", dot: "bg-warning" },
};

export function movementTypeLabel(type: MovementType): string {
  return MOVEMENT_TYPES.find((entry) => entry.value === type)?.label ?? type;
}

export function movementTypeMeta(type: MovementType) {
  return { label: movementTypeLabel(type), ...MOVEMENT_TYPE_META[type] };
}

export function MovementTypeBadge({ type, className }: { type: MovementType; className?: string }) {
  const meta = movementTypeMeta(type);
  return (
    <Badge variant={meta.variant} className={cn("gap-1.5", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} aria-hidden="true" />
      {meta.label}
    </Badge>
  );
}
