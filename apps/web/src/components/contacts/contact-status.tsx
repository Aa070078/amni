"use client";

import { CONTACT_STATUSES, type ContactStatus } from "@amni/shared";
import { Badge, cn, type BadgeProps } from "@amni/ui";

const CONTACT_STATUS_META: Record<ContactStatus, { variant: BadgeProps["variant"]; dot: string }> = {
  active: { variant: "success", dot: "bg-success" },
  inactive: { variant: "secondary", dot: "bg-foreground/50" },
};

export function contactStatusLabel(status: ContactStatus): string {
  return CONTACT_STATUSES.find((entry) => entry.value === status)?.label ?? status;
}

export function contactStatusMeta(status: ContactStatus) {
  return { label: contactStatusLabel(status), ...CONTACT_STATUS_META[status] };
}

export function ContactStatusBadge({ status, className }: { status: ContactStatus; className?: string }) {
  const meta = contactStatusMeta(status);
  return (
    <Badge variant={meta.variant} className={cn("gap-1.5", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} aria-hidden="true" />
      {meta.label}
    </Badge>
  );
}
