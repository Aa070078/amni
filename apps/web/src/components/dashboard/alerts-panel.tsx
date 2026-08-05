"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowRight, Bell, Info, ShieldCheck, TriangleAlert } from "lucide-react";
import { Badge, Card, CardContent, Skeleton } from "@amni/ui";
import type { DashboardAlert, DashboardAlerts } from "@amni/shared";
import { cn } from "@amni/ui";
import { api } from "@/src/lib/api";
import { PanelEmpty, PanelError, PanelHeader } from "./panel-utils";

const SEVERITY_BADGE: Record<DashboardAlert["severity"], "destructive" | "warning" | "secondary"> = {
  critical: "destructive",
  warning: "warning",
  info: "secondary",
};

const SEVERITY_ICON: Record<DashboardAlert["severity"], typeof TriangleAlert> = {
  critical: TriangleAlert,
  warning: TriangleAlert,
  info: Info,
};

const SEVERITY_COLOR: Record<DashboardAlert["severity"], string> = {
  critical: "text-destructive",
  warning: "text-warning",
  info: "text-muted-foreground",
};

function AlertsSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-16 rounded-md" />
      ))}
    </div>
  );
}

function AlertRow({ alert }: { alert: DashboardAlert }) {
  const Icon = SEVERITY_ICON[alert.severity];
  const row = (
    <div className="flex items-start gap-3 rounded-md border p-3">
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", SEVERITY_COLOR[alert.severity])} aria-hidden />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{alert.title}</p>
          <Badge variant={SEVERITY_BADGE[alert.severity]}>{alert.severity}</Badge>
        </div>
        {alert.description ? <p className="text-sm text-muted-foreground">{alert.description}</p> : null}
      </div>
      {alert.href ? <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden /> : null}
    </div>
  );

  return alert.href ? (
    <Link href={alert.href} className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {row}
    </Link>
  ) : (
    row
  );
}

export function AlertsPanel() {
  const query = useQuery({
    queryKey: ["dashboard", "alerts"],
    queryFn: () => api<DashboardAlerts>("/dashboard/alerts"),
  });

  return (
    <Card className="h-full">
      <PanelHeader icon={Bell} title="Alerts" count={query.data?.alerts.length} />
      <CardContent>
        {query.isLoading ? (
          <AlertsSkeleton />
        ) : query.isError ? (
          <PanelError onRetry={() => void query.refetch()} />
        ) : query.data ? (
          query.data.alerts.length === 0 ? (
            <PanelEmpty
              icon={ShieldCheck}
              title="All clear"
              description="No alerts right now — we'll let you know when something needs attention."
            />
          ) : (
            <div className="space-y-3">
              {query.data.alerts.map((alert) => (
                <AlertRow key={alert.id} alert={alert} />
              ))}
            </div>
          )
        ) : null}
      </CardContent>
    </Card>
  );
}
