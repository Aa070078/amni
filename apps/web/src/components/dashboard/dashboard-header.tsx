"use client";

import { useMe } from "@/src/hooks/use-me";

export function DashboardHeader() {
  const me = useMe();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const name = me.data ? [me.data.firstName, me.data.lastName].filter(Boolean).join(" ") : null;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">
        {greeting}
        {name ? `, ${name}` : ""}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">Here&apos;s what&apos;s happening at Demo Co.</p>
    </div>
  );
}
