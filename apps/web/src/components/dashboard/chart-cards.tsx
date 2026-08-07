"use client";

import { Banknote, TrendingUp, Wallet } from "lucide-react";
import { Card, CardContent } from "@amni/ui";
import type { DashboardArBucket, DashboardSeriesPoint } from "@amni/shared";
import { formatCurrency } from "@/src/lib/format";
import { formatCompact } from "@/src/lib/chart";
import { AreaChart } from "./area-chart";
import { ArAging } from "./ar-aging";
import { PanelHeader } from "./panel-utils";

const currency = (value: number) => formatCurrency(value, "USD");
const compactUsd = (value: number) => `$${formatCompact(value)}`;

export function RevenueTrendCard({ data }: { data: DashboardSeriesPoint[] }) {
  return (
    <Card className="h-full">
      <PanelHeader icon={TrendingUp} title="Revenue trend" />
      <CardContent>
        <AreaChart data={data} ariaLabel="Monthly revenue over the last 12 months" formatValue={currency} formatTick={compactUsd} />
      </CardContent>
    </Card>
  );
}

export function CashPositionCard({ data }: { data: DashboardSeriesPoint[] }) {
  const last = data[data.length - 1];
  return (
    <Card className="h-full">
      <PanelHeader icon={Wallet} title="Cash position" />
      <CardContent className="space-y-4">
        <p className="text-2xl font-semibold tracking-tight tabular-nums">
          {last ? currency(last.value) : "—"}
        </p>
        <AreaChart data={data} variant="sparkline" ariaLabel="Cash balance over the last 12 months" formatValue={currency} />
      </CardContent>
    </Card>
  );
}

export function ArAgingCard({ data }: { data: DashboardArBucket[] }) {
  return (
    <Card className="h-full">
      <PanelHeader icon={Banknote} title="Receivables aging" />
      <CardContent>
        <ArAging buckets={data} />
      </CardContent>
    </Card>
  );
}
