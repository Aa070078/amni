"use client";

import { Activity, CircleCheck, LoaderCircle, ServerOff } from "lucide-react";
import { Badge } from "@amni/ui";
import { useDashboardSnapshot } from "@/src/hooks/use-dashboard-snapshot";
import { useMe } from "@/src/hooks/use-me";
import { ApiError } from "@/src/lib/api";

export function DashboardHero() {
  const me = useMe();
  const snapshot = useDashboardSnapshot();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const name = me.data ? [me.data.firstName, me.data.lastName].filter(Boolean).join(" ") : null;
  const erpOffline =
    snapshot.error instanceof ApiError && snapshot.error.code === "erp_unreachable";
  const status = erpOffline
    ? {
        label: "ERP needs attention",
        detail: "Business data is unavailable. Your settings remain accessible.",
        icon: ServerOff,
        variant: "destructive" as const,
      }
    : snapshot.isSuccess
      ? {
          label: "Data is up to date",
          detail: "Your workspace is connected and ready.",
          icon: CircleCheck,
          variant: "success" as const,
        }
      : {
          label: "Syncing workspace",
          detail: "Connecting to your business data.",
          icon: LoaderCircle,
        variant: "warning" as const,
      };
  const StatusIcon = status.icon;
  const isSyncing = !erpOffline && !snapshot.isSuccess;

  return (
    <section className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className="h-1 bg-primary" aria-hidden="true" />
      <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>Your workspace</span>
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {greeting}
            {name ? `, ${name}` : ""}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            A clear view of your business performance, priorities, and recent activity.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-lg border bg-secondary/50 px-4 py-3 lg:min-w-64">
          <Badge variant={status.variant} className="shrink-0 rounded-full p-1.5" aria-hidden="true">
            <StatusIcon className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin motion-reduce:animate-none" : ""}`} />
          </Badge>
          <div role="status" aria-live="polite">
            <p className="text-sm font-semibold text-foreground">{status.label}</p>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{status.detail}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
