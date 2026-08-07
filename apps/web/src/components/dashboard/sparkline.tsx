"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useId } from "react";
import { cn } from "@amni/ui";
import type { KpiTrend } from "@amni/shared";
import { areaPath, buildPoints, linePath, niceDomain } from "@/src/lib/chart";

const WIDTH = 100;
const HEIGHT = 32;
const PAD = 3;

interface SparklineProps {
  data: number[];
  trend: KpiTrend;
  className?: string;
}

export function Sparkline({ data, trend, className }: SparklineProps) {
  const reducedMotion = useReducedMotion();
  const gradientId = useId().replace(/:/g, "");
  const min = Math.min(...data);
  const max = Math.max(...data);
  const points = buildPoints(data, WIDTH, HEIGHT, niceDomain(min, max, 1), PAD);
  const line = linePath(points);
  const area = areaPath(points, HEIGHT, PAD);
  const color = trend === "down" ? "var(--destructive)" : trend === "up" ? "var(--primary)" : "var(--muted-foreground)";

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className={cn("h-8 w-full", className)} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {area ? (
        <motion.path
          d={area}
          fill={`url(#${gradientId})`}
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.25 }}
        />
      ) : null}
      {line ? (
        <motion.path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reducedMotion ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
        />
      ) : null}
    </svg>
  );
}
