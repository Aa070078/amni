"use client";

import Link from "next/link";
import { CalendarDays, Mail } from "lucide-react";
import type { DragEvent } from "react";
import type { Deal } from "@amni/shared";
import { cn } from "@amni/ui";
import { formatCurrency } from "@/src/lib/format";
import { formatDealDate } from "@/src/lib/deals";
import { DealStageBadge, dealSourceLabel } from "./deal-stage";

interface DealCardProps {
  deal: Deal;
  dragging?: boolean;
  onDragStart: (event: DragEvent<HTMLAnchorElement>, code: string) => void;
  onDragEnd: () => void;
}

export function DealCard({ deal, dragging, onDragStart, onDragEnd }: DealCardProps) {
  return (
    <Link
      href={`/sales/deals/${deal.code}`}
      draggable
      onDragStart={(event) => onDragStart(event, deal.code)}
      onDragEnd={onDragEnd}
      className={cn(
        "group flex flex-col gap-2 rounded-lg border bg-card p-3 shadow-sm transition-colors hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        dragging && "opacity-50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{deal.title}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {deal.company} · {deal.contactName}
          </p>
        </div>
        <DealStageBadge stage={deal.stage} className="shrink-0" />
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {formatCurrency(deal.value, deal.currency)}
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">{deal.probability}%</span>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <CalendarDays className="h-3 w-3" aria-hidden="true" />
          {formatDealDate(deal.expectedClose)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Mail className="h-3 w-3" aria-hidden="true" />
          {dealSourceLabel(deal.source)}
        </span>
      </div>
    </Link>
  );
}
