"use client";

import { useState, type DragEvent } from "react";
import { DEAL_STAGES, type Deal, type DealStage, type DealStageStat } from "@amni/shared";
import { cn } from "@amni/ui";
import { formatCurrency } from "@/src/lib/format";
import { DealCard } from "./deal-card";
import { dealStageMeta } from "./deal-stage";

interface DealsBoardProps {
  deals: Deal[];
  stats: DealStageStat[];
  onMoveStage: (code: string, stage: DealStage) => void;
}

export function DealsBoard({ deals, stats, onMoveStage }: DealsBoardProps) {
  const [dragCode, setDragCode] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<DealStage | null>(null);

  function handleDrop(stage: DealStage, event: DragEvent<HTMLElement>) {
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
      aria-label="Deal pipeline board"
    >
      {DEAL_STAGES.map(({ value }) => {
        const meta = dealStageMeta(value);
        const columnDeals = deals.filter((deal) => deal.stage === value);
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
                  aria-label={`${columnDeals.length} deals`}
                >
                  {columnDeals.length}
                </span>
              </div>
              <span className="text-xs font-medium tabular-nums text-muted-foreground">
                {formatCurrency(stat?.value ?? 0, "USD")}
              </span>
            </header>

            <div className="flex flex-col gap-2">
              {columnDeals.map((deal) => (
                <DealCard
                  key={deal.code}
                  deal={deal}
                  dragging={dragCode === deal.code}
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
              {columnDeals.length === 0 && (
                <p className="rounded-md border border-dashed px-2 py-4 text-center text-xs text-muted-foreground">
                  No deals
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
