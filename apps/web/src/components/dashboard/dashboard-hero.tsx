"use client";

import dynamic from "next/dynamic";
import { ServerOff } from "lucide-react";
import { useDashboardSnapshot } from "@/src/hooks/use-dashboard-snapshot";
import { useMe } from "@/src/hooks/use-me";
import { ApiError } from "@/src/lib/api";

const Hero3D = dynamic(() => import("./hero-3d").then((module) => module.Hero3D), {
  ssr: false,
  loading: () => null,
});

export function DashboardHero() {
  const me = useMe();
  const snapshot = useDashboardSnapshot();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const name = me.data ? [me.data.firstName, me.data.lastName].filter(Boolean).join(" ") : null;
  const erpOffline =
    snapshot.error instanceof ApiError && snapshot.error.code === "erp_unreachable";

  return (
    <section className="relative overflow-hidden rounded-lg border bg-card p-6 shadow-sm sm:p-8">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,color-mix(in_oklch,var(--primary)_14%,transparent),transparent_62%)]"
      />
      <div className="hidden lg:block" aria-hidden="true">
        <Hero3D />
      </div>

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <p className="text-sm font-medium text-muted-foreground">Your workspace</p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">
            {greeting}
            {name ? `, ${name}` : ""}
          </h1>
          <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
            Your company at a glance — key numbers, trends, and anything that needs your attention.
          </p>
        </div>

        <span className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
          {erpOffline ? (
            <ServerOff className="h-3.5 w-3.5 text-destructive" aria-hidden />
          ) : (
            <span className="relative flex h-2 w-2">
              {snapshot.isSuccess ? (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60 motion-reduce:animate-none" />
              ) : null}
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${snapshot.isSuccess ? "bg-success" : "bg-warning"}`}
              />
            </span>
          )}
          {erpOffline ? "ERP offline" : snapshot.isSuccess ? "Live data" : "Connecting"}
        </span>
      </div>
    </section>
  );
}
