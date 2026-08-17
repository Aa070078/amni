"use client";

import { Sparkles } from "lucide-react";
import { Skeleton } from "@amni/ui";
import { useDashboardSnapshot } from "@/src/hooks/use-dashboard-snapshot";
import { formatRelativeTime } from "@/src/lib/format";
import { KpiGrid } from "./kpi-grid";
import { QuickActions } from "./quick-actions";
import { ArAgingCard, CashPositionCard, RevenueTrendCard } from "./chart-cards";
import { PanelEmpty, PanelError } from "./panel-utils";

function OverviewSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-64 rounded-lg lg:col-span-2" />
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-44 rounded-lg lg:col-span-3" />
      </div>
    </div>
  );
}

export function OverviewPanel() {
  const query = useDashboardSnapshot();

  if (query.isLoading) {
    return <OverviewSkeleton />;
  }

  if (query.isError) {
    return <PanelError error={query.error} onRetry={() => void query.refetch()} />;
  }

  const overview = query.data?.overview;
  if (!overview) {
    return null;
  }

  if (overview.kpis.length === 0) {
    return (
      <PanelEmpty
        icon={Sparkles}
        title="No metrics yet"
        description="We'll surface your key numbers here once your workspace has data."
      />
    );
  }

  const hasCharts = Boolean(overview.revenueTrend || overview.cashTrend || overview.arAging);

  return (
    <div className="space-y-6">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
        Data as of {formatRelativeTime(overview.asOf)}
        {overview.revenueTrend ? ` · ${overview.revenueTrend.length} months shown` : null}
      </p>

      <KpiGrid kpis={overview.kpis} />

      {hasCharts ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {overview.revenueTrend ? (
            <div className="lg:col-span-2">
              <RevenueTrendCard data={overview.revenueTrend} />
            </div>
          ) : null}
          {overview.cashTrend ? (
            <div>
              <CashPositionCard data={overview.cashTrend} />
            </div>
          ) : null}
          {overview.arAging ? (
            <div className="lg:col-span-3">
              <ArAgingCard data={overview.arAging} />
            </div>
          ) : null}
        </div>
      ) : null}

      {overview.quickActions.length > 0 ? (
        <QuickActions actions={overview.quickActions} />
      ) : (
        <PanelEmpty
          icon={Sparkles}
          title="No quick actions for your role"
          description="Ask an admin to adjust your role to unlock shortcuts."
        />
      )}
    </div>
  );
}
