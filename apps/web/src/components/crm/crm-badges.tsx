"use client";

import Link from "next/link";
import {
  CRM_CALL_STATUSES,
  CRM_TASK_PRIORITIES,
  CRM_TASK_STATUSES,
  ORGANIZATION_STATUSES,
  type CrmCallStatus,
  type CrmReferenceType,
  type CrmTaskPriority,
  type CrmTaskStatus,
  type OrganizationStatus,
} from "@amni/shared";
import { Badge, cn, type BadgeProps } from "@amni/ui";

export const CRM_REFERENCE_LABELS: Record<CrmReferenceType, string> = {
  deal: "Deal",
  lead: "Lead",
  organization: "Company",
  contact: "Contact",
  task: "Task",
  note: "Note",
};

export function crmReferenceHref(type: CrmReferenceType, code: string): string {
  switch (type) {
    case "organization":
      return `/crm/organizations/${encodeURIComponent(code)}`;
    case "contact":
      return `/crm/contacts/${encodeURIComponent(code)}`;
    case "task":
      return `/crm/tasks/${encodeURIComponent(code)}`;
    case "note":
      return `/crm/notes/${encodeURIComponent(code)}`;
    case "deal":
      return `/sales/deals/${encodeURIComponent(code)}`;
    case "lead":
      return `/sales/leads/${encodeURIComponent(code)}`;
  }
}

export function CrmReferenceChip({
  referenceType,
  referenceCode,
}: {
  referenceType: CrmReferenceType | null | undefined;
  referenceCode: string | null | undefined;
}) {
  if (!referenceType || !referenceCode) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return (
    <Link
      href={crmReferenceHref(referenceType, referenceCode)}
      className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-foreground hover:bg-accent"
    >
      {CRM_REFERENCE_LABELS[referenceType]}
      <span className="tabular-nums text-muted-foreground">{referenceCode}</span>
    </Link>
  );
}

const CALL_STATUS_META: Record<CrmCallStatus, { variant: BadgeProps["variant"]; dot: string }> = {
  completed: { variant: "success", dot: "bg-success" },
  missed: { variant: "destructive", dot: "bg-destructive" },
  in_progress: { variant: "default", dot: "bg-primary" },
  failed: { variant: "destructive", dot: "bg-destructive" },
  cancelled: { variant: "outline", dot: "bg-muted-foreground/60" },
  busy: { variant: "warning", dot: "bg-warning" },
  ringing: { variant: "secondary", dot: "bg-foreground/50" },
};

export function crmCallStatusLabel(status: CrmCallStatus): string {
  return CRM_CALL_STATUSES.find((entry) => entry.value === status)?.label ?? status;
}

export function CrmCallStatusBadge({ status, className }: { status: CrmCallStatus; className?: string }) {
  const meta = CALL_STATUS_META[status];
  return (
    <Badge variant={meta.variant} className={cn("gap-1.5", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} aria-hidden="true" />
      {crmCallStatusLabel(status)}
    </Badge>
  );
}

export function formatCallDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "—";
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (minutes === 0) return `${remainder}s`;
  return `${minutes}m ${remainder}s`;
}

const TASK_STATUS_META: Record<CrmTaskStatus, { variant: BadgeProps["variant"]; dot: string }> = {
  backlog: { variant: "outline", dot: "bg-muted-foreground/60" },
  working: { variant: "default", dot: "bg-primary" },
  review: { variant: "warning", dot: "bg-warning" },
  done: { variant: "success", dot: "bg-success" },
  cancelled: { variant: "outline", dot: "bg-destructive/70" },
};

export function crmTaskStatusLabel(status: CrmTaskStatus): string {
  return CRM_TASK_STATUSES.find((entry) => entry.value === status)?.label ?? status;
}

export function CrmTaskStatusBadge({ status, className }: { status: CrmTaskStatus; className?: string }) {
  const meta = TASK_STATUS_META[status];
  return (
    <Badge variant={meta.variant} className={cn("gap-1.5", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} aria-hidden="true" />
      {crmTaskStatusLabel(status)}
    </Badge>
  );
}

const TASK_PRIORITY_META: Record<CrmTaskPriority, BadgeProps["variant"]> = {
  low: "secondary",
  medium: "outline",
  high: "warning",
  urgent: "destructive",
};

export function crmTaskPriorityLabel(priority: CrmTaskPriority): string {
  return CRM_TASK_PRIORITIES.find((entry) => entry.value === priority)?.label ?? priority;
}

export function CrmTaskPriorityBadge({ priority, className }: { priority: CrmTaskPriority; className?: string }) {
  return (
    <Badge variant={TASK_PRIORITY_META[priority]} className={className}>
      {crmTaskPriorityLabel(priority)}
    </Badge>
  );
}

const ORG_STATUS_META: Record<OrganizationStatus, { variant: BadgeProps["variant"]; dot: string }> = {
  lead: { variant: "warning", dot: "bg-warning" },
  active: { variant: "success", dot: "bg-success" },
  inactive: { variant: "outline", dot: "bg-muted-foreground/60" },
};
const UNKNOWN_ORG_STATUS_META = { variant: "outline" as const, dot: "bg-muted-foreground/60" };

export function orgStatusLabel(status: OrganizationStatus): string {
  return ORGANIZATION_STATUSES.find((entry) => entry.value === status)?.label ?? status;
}

export function OrgStatusBadge({ status, className }: { status: OrganizationStatus | null | undefined; className?: string }) {
  const meta = status ? ORG_STATUS_META[status] ?? UNKNOWN_ORG_STATUS_META : UNKNOWN_ORG_STATUS_META;
  return (
    <Badge variant={meta.variant} className={cn("gap-1.5", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} aria-hidden="true" />
      {status ? orgStatusLabel(status) : "Unknown"}
    </Badge>
  );
}
