"use client";

import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { Skeleton } from "@amni/ui";
import type { DashboardOverview } from "@amni/shared";
import { api } from "@/src/lib/api";
import { KpiGrid } from "./kpi-grid";
import { QuickActions } from "./quick-actions";
import { PanelEmpty, PanelError } from "./panel-utils";

function OverviewSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-16 rounded-md" />
        ))}
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

  return (
    <div className="space-y-6">
      <KpiGrid kpis={overview.kpis} />
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
