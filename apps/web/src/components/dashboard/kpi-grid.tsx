"use client";

import type { DashboardKpi } from "@amni/shared";
import { KpiCard } from "./kpi-card";

export function KpiGrid({ kpis }: { kpis: DashboardKpi[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
      {kpis.map((kpi, index) => (
        <KpiCard key={kpi.id} kpi={kpi} index={index} />
      ))}
    </div>
  );
}
