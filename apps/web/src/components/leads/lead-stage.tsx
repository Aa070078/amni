"use client";

import { LEAD_SOURCES, LEAD_STAGES, type LeadSource, type LeadStage } from "@amni/shared";
import { Badge, cn, type BadgeProps } from "@amni/ui";

const LEAD_STAGE_META: Record<
  LeadStage,
  { variant: BadgeProps["variant"]; dot: string }
> = {
  new: { variant: "outline", dot: "bg-muted-foreground/60" },
  contacted: { variant: "secondary", dot: "bg-foreground/50" },
  qualified: { variant: "warning", dot: "bg-warning" },
  proposal: { variant: "default", dot: "bg-primary" },
  won: { variant: "success", dot: "bg-success" },
  lost: { variant: "outline", dot: "bg-destructive/70" },
};

export function leadStageLabel(stage: LeadStage): string {
  return LEAD_STAGES.find((entry) => entry.value === stage)?.label ?? stage;
}

export function leadStageMeta(stage: LeadStage) {
  return { label: leadStageLabel(stage), ...LEAD_STAGE_META[stage] };
}

export function leadSourceLabel(source: LeadSource): string {
  return LEAD_SOURCES.find((entry) => entry.value === source)?.label ?? source;
}

export function LeadStageBadge({ stage, className }: { stage: LeadStage; className?: string }) {
  const meta = leadStageMeta(stage);
  return (
    <Badge variant={meta.variant} className={cn("gap-1.5", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} aria-hidden="true" />
      {meta.label}
    </Badge>
  );
}
