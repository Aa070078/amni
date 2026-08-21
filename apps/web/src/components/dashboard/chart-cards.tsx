"use client";

import { Banknote, TrendingUp, Wallet } from "lucide-react";
import { Badge, Card, CardContent } from "@amni/ui";
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
      <PanelHeader
        icon={TrendingUp}
        title="Revenue trend"
        action={<Badge variant="secondary">Last {data.length} months</Badge>}
      />
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
      <PanelHeader icon={Wallet} title="Cash position" action={<Badge variant="secondary">Current</Badge>} />
      <CardContent className="space-y-4">
        <div>
          <p className="text-2xl font-semibold tracking-tight">
            {last ? currency(last.value) : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Closing balance {last?.label ?? ""}</p>
        </div>
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
