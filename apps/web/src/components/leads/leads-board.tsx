"use client";

import { useState, type DragEvent } from "react";
import { LEAD_STAGES, type Lead, type LeadStage, type LeadStageStat } from "@amni/shared";
import { cn } from "@amni/ui";
import { formatCurrency } from "@/src/lib/format";
import { LeadCard } from "./lead-card";
import { leadStageMeta } from "./lead-stage";

interface LeadsBoardProps {
  leads: Lead[];
  stats: LeadStageStat[];
  onMoveStage: (code: string, stage: LeadStage) => void;
}

export function LeadsBoard({ leads, stats, onMoveStage }: LeadsBoardProps) {
  const [dragCode, setDragCode] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<LeadStage | null>(null);

  function handleDrop(stage: LeadStage, event: DragEvent<HTMLElement>) {
    event.preventDefault();
    const code = dragCode ?? event.dataTransfer.getData("text/plain");
    setDragCode(null);
    setOverStage(null);
    if (code) onMoveStage(code, stage);
  }

  return (
    <div
      className="flex gap-3 overflow-x-auto pb-2"
      role="region"
      aria-label="Lead pipeline board"
    >
      {LEAD_STAGES.map(({ value }) => {
        const meta = leadStageMeta(value);
        const columnLeads = leads.filter((lead) => lead.stage === value);
        const stat = stats.find((entry) => entry.stage === value);
        return (
          <section
            key={value}
            aria-label={`${meta.label} stage`}
            onDragOver={(event) => {
              event.preventDefault();
              setOverStage(value);
            }}
            onDragLeave={() => setOverStage((current) => (current === value ? null : current))}
            onDrop={(event) => handleDrop(value, event)}
            className={cn(
              "flex min-h-[320px] w-[272px] shrink-0 flex-col rounded-xl border bg-muted/30 p-2 transition-colors",
              overStage === value && "border-primary bg-muted/60",
            )}
          >
            <header className="flex items-center justify-between gap-2 px-1.5 py-2">
              <div className="flex items-center gap-2">
                <span className={cn("h-2 w-2 rounded-full", meta.dot)} aria-hidden="true" />
                <h3 className="text-sm font-semibold text-foreground">{meta.label}</h3>
                <span
                  className="rounded-full bg-muted-foreground/10 px-2 py-0.5 text-xs tabular-nums text-muted-foreground"
                  aria-label={`${columnLeads.length} leads`}
                >
                  {columnLeads.length}
                </span>
              </div>
              <span className="text-xs font-medium tabular-nums text-muted-foreground">
                {formatCurrency(stat?.value ?? 0, "USD")}
              </span>
            </header>

            <div className="flex flex-col gap-2">
              {columnLeads.map((lead) => (
                <LeadCard
                  key={lead.code}
                  lead={lead}
                  dragging={dragCode === lead.code}
                  onDragStart={(event, code) => {
                    setDragCode(code);
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", code);
                  }}
                  onDragEnd={() => {
                    setDragCode(null);
                    setOverStage(null);
                  }}
                />
              ))}
              {columnLeads.length === 0 && (
                <p className="rounded-md border border-dashed px-2 py-4 text-center text-xs text-muted-foreground">
                  No leads
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
