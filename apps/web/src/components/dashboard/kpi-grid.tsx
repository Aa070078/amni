import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Badge, Card, CardContent } from "@amni/ui";
import type { DashboardKpi, KpiTrend } from "@amni/shared";
import { cn } from "@amni/ui";
import { formatDelta, formatKpiValue } from "@/src/lib/format";

const TREND_ICONS: Record<KpiTrend, typeof ArrowUpRight> = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  flat: Minus,
};

const TREND_COLORS: Record<KpiTrend, string> = {
  up: "text-emerald-600 dark:text-emerald-500",
  down: "text-destructive",
  flat: "text-muted-foreground",
};

export function KpiGrid({ kpis }: { kpis: DashboardKpi[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
      {kpis.map((kpi) => {
        const trend = kpi.trend ?? "flat";
        const TrendIcon = TREND_ICONS[trend];
        return (
          <Card key={kpi.id}>
            <CardContent className="space-y-2 p-5">
              <p className="text-sm text-muted-foreground">{kpi.label}</p>
              <p className="text-2xl font-semibold tracking-tight">{formatKpiValue(kpi)}</p>
              <div className="flex items-center gap-1.5 text-xs">
                {kpi.delta !== undefined ? (
                  <Badge variant="secondary" className={cn("gap-1", TREND_COLORS[trend])}>
                    <TrendIcon className="h-3 w-3" aria-hidden />
                    {formatDelta(kpi.delta)}
                  </Badge>
                ) : null}
                {kpi.deltaLabel ? <span className="text-muted-foreground">{kpi.deltaLabel}</span> : null}
              </div>
              {kpi.hint ? <p className="text-xs text-muted-foreground">{kpi.hint}</p> : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
