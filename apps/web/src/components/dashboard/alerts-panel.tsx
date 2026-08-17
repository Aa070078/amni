"use client";

import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowRight, Bell, Info, ShieldCheck, TriangleAlert } from "lucide-react";
import { Badge, Card, CardContent, Skeleton } from "@amni/ui";
import type { DashboardAlert } from "@amni/shared";
import { cn } from "@amni/ui";
import { useDashboardSnapshot } from "@/src/hooks/use-dashboard-snapshot";
import { PanelEmpty, PanelError, PanelHeader } from "./panel-utils";

const SEVERITY_BADGE: Record<DashboardAlert["severity"], "destructive" | "warning" | "secondary"> =
  {
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
        {alert.description ? (
          <p className="text-sm text-muted-foreground">{alert.description}</p>
        ) : null}
      </div>
      {alert.href ? (
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      ) : null}
    </div>
  );

  return alert.href ? (
    <Link
      href={alert.href}
      className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {row}
    </Link>
  ) : (
    row
  );
}

export function AlertsPanel() {
  const query = useDashboardSnapshot();
  const alerts = query.data?.alerts.alerts;
  const reducedMotion = useReducedMotion();
  const listVariants: Variants = reducedMotion
    ? { hidden: {}, show: {} }
    : { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
  const itemVariants: Variants = reducedMotion
    ? { hidden: {}, show: {} }
    : {
        hidden: { opacity: 0, y: 8 },
        show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
      };

  return (
    <Card className="h-full">
      <PanelHeader icon={Bell} title="Alerts" count={alerts?.length} />
      <CardContent>
        {query.isLoading ? (
          <AlertsSkeleton />
        ) : query.isError ? (
          <PanelError error={query.error} onRetry={() => void query.refetch()} />
        ) : alerts ? (
          alerts.length === 0 ? (
            <PanelEmpty
              icon={ShieldCheck}
              title="All clear"
              description="No alerts right now — we'll let you know when something needs attention."
            />
          ) : (
            <motion.div
              variants={listVariants}
              initial="hidden"
              animate="show"
              className="space-y-3"
            >
              {alerts.map((alert) => (
                <motion.div key={alert.id} variants={itemVariants}>
                  <AlertRow alert={alert} />
                </motion.div>
              ))}
            </motion.div>
          )
        ) : null}
      </CardContent>
    </Card>
  );
}
