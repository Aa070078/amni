"use client";

import { DEAL_SOURCES, DEAL_STAGES, type DealSource, type DealStage } from "@amni/shared";
import { Badge, cn, type BadgeProps } from "@amni/ui";

const DEAL_STAGE_META: Record<
  DealStage,
  { variant: BadgeProps["variant"]; dot: string }
> = {
  qualification: { variant: "outline", dot: "bg-muted-foreground/60" },
  analysis: { variant: "secondary", dot: "bg-foreground/50" },
  proposal: { variant: "warning", dot: "bg-warning" },
  negotiation: { variant: "default", dot: "bg-primary" },
  won: { variant: "success", dot: "bg-success" },
  lost: { variant: "outline", dot: "bg-destructive/70" },
};

export function dealStageLabel(stage: DealStage): string {
  return DEAL_STAGES.find((entry) => entry.value === stage)?.label ?? stage;
}

export function dealStageMeta(stage: DealStage) {
  return { label: dealStageLabel(stage), ...DEAL_STAGE_META[stage] };
}

export function dealSourceLabel(source: DealSource): string {
  return DEAL_SOURCES.find((entry) => entry.value === source)?.label ?? source;
}

export function DealStageBadge({ stage, className }: { stage: DealStage; className?: string }) {
  const meta = dealStageMeta(stage);
  return (
    <Badge variant={meta.variant} className={cn("gap-1.5", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} aria-hidden="true" />
      {meta.label}
    </Badge>
  );
}
