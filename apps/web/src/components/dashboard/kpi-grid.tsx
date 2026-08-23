"use client";

import type { DashboardKpi } from "@amni/shared";
import { KpiCard } from "./kpi-card";

export function KpiGrid({ kpis }: { kpis: DashboardKpi[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi, index) => (
        <KpiCard key={kpi.id} kpi={kpi} index={index} />
      ))}
    </div>
  );
}
