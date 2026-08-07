"use client";

import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { Skeleton } from "@amni/ui";
import type { DashboardOverview } from "@amni/shared";
import { api } from "@/src/lib/api";
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
        <Skeleton className="h-72 rounded-lg lg:col-span-2" />
        <div className="space-y-6">
          <Skeleton className="h-56 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function OverviewPanel() {
  const query = useQuery({
    queryKey: ["dashboard", "overview"],
    queryFn: () => api<DashboardOverview>("/dashboard/overview"),
  });

  if (query.isLoading) {
    return <OverviewSkeleton />;
  }

  if (query.isError) {
    return <PanelError onRetry={() => void query.refetch()} />;
  }

  const overview = query.data;
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
          {overview.cashTrend || overview.arAging ? (
            <div className="space-y-6">
              {overview.cashTrend ? <CashPositionCard data={overview.cashTrend} /> : null}
              {overview.arAging ? <ArAgingCard data={overview.arAging} /> : null}
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
