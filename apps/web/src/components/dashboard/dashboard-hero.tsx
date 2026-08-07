"use client";

import dynamic from "next/dynamic";
import { useMe } from "@/src/hooks/use-me";

const Hero3D = dynamic(() => import("./hero-3d").then((module) => module.Hero3D), {
  ssr: false,
  loading: () => null,
});

export function DashboardHero() {
  const me = useMe();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const name = me.data ? [me.data.firstName, me.data.lastName].filter(Boolean).join(" ") : null;

  return (
    <section className="relative overflow-hidden rounded-lg border bg-card p-6 shadow-sm sm:p-8">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,color-mix(in_oklch,var(--primary)_14%,transparent),transparent_62%)]"
      />
      <Hero3D />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Demo Co.</p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">
            {greeting}
            {name ? `, ${name}` : ""}
          </h1>
          <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
            Your company at a glance — key numbers, trends, and anything that needs your attention.
          </p>
        </div>

        <span className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          Live
        </span>
      </div>
    </section>
  );
}
