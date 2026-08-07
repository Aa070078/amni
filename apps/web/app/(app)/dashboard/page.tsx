import type { Metadata } from "next";
import { DashboardHero } from "@/src/components/dashboard/dashboard-hero";
import { OverviewPanel } from "@/src/components/dashboard/overview-panel";
import { AlertsPanel } from "@/src/components/dashboard/alerts-panel";
import { ActivityPanel } from "@/src/components/dashboard/activity-panel";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <DashboardHero />
      <OverviewPanel />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AlertsPanel />
        </div>
        <ActivityPanel />
      </div>
    </div>
  );
}
