"use client";

import { animate, motion, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Badge, Card, CardContent, cn } from "@amni/ui";
import type { DashboardKpi, KpiTrend } from "@amni/shared";
import { formatDelta, formatKpiValue } from "@/src/lib/format";
import { Sparkline } from "./sparkline";

const TREND_ICONS: Record<KpiTrend, typeof ArrowUpRight> = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  flat: Minus,
};

const TREND_COLORS: Record<KpiTrend, string> = {
  up: "text-emerald-600 dark:text-emerald-500",
  down: "text-destructive",
  flat: "text-muted-foreground",
};

function useCountUp(target: number, enabled: boolean): number {
  const [value, setValue] = useState(enabled ? 0 : target);
  useEffect(() => {
    if (!enabled) return;
    const controls = animate(0, target, {
      duration: 1.1,
      ease: "easeOut",
      onUpdate: (next) => setValue(next),
    });
    return () => controls.stop();
  }, [enabled, target]);
  return value;
}

export function KpiCard({ kpi, index }: { kpi: DashboardKpi; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reducedMotion = useReducedMotion();
  const countUp = useCountUp(kpi.value, inView === true && !reducedMotion);
  const animatedKpi: DashboardKpi = { ...kpi, value: countUp };
  const trend = kpi.trend ?? "flat";
  const TrendIcon = TREND_ICONS[trend];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 14 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.45, delay: index * 0.06, ease: "easeOut" }}
      whileHover={{ y: -4 }}
      className="h-full"
    >
      <Card className="h-full overflow-hidden transition-shadow duration-300 hover:shadow-lg">
        <CardContent className="flex h-full flex-col justify-between gap-3 p-5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-muted-foreground">{kpi.label}</p>
            {kpi.hint ? (
              <span className="text-[11px] leading-tight text-muted-foreground/80" title={kpi.hint}>
                {kpi.hint}
              </span>
            ) : null}
          </div>

          <p className="text-2xl font-semibold tracking-tight tabular-nums">{formatKpiValue(animatedKpi)}</p>

          <div className="flex items-center gap-1.5 text-xs">
            {kpi.delta !== undefined ? (
              <Badge variant="secondary" className={cn("gap-1", TREND_COLORS[trend])}>
                <TrendIcon className="h-3 w-3" aria-hidden />
                {formatDelta(kpi.delta)}
              </Badge>
            ) : null}
            {kpi.deltaLabel ? <span className="text-muted-foreground">{kpi.deltaLabel}</span> : null}
          </div>

          {kpi.sparkline ? <Sparkline data={kpi.sparkline} trend={trend} className="mt-1" /> : null}
        </CardContent>
      </Card>
    </motion.div>
  );
}
