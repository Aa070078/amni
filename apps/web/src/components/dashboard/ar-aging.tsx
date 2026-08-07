"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { DashboardArBucket } from "@amni/shared";
import { formatCurrency } from "@/src/lib/format";

interface ArAgingProps {
  buckets: DashboardArBucket[];
}

function bucketColor(index: number, length: number): string {
  if (index >= length - 1) return "var(--destructive)";
  if (index >= length - 2) return "var(--warning)";
  return "var(--primary)";
}

export function ArAging({ buckets }: ArAgingProps) {
  const reducedMotion = useReducedMotion();
  const total = buckets.reduce((sum, bucket) => sum + bucket.value, 0);

  return (
    <ul className="space-y-4">
      {buckets.map((bucket, index) => {
        const share = total > 0 ? (bucket.value / total) * 100 : 0;
        return (
          <li key={bucket.label} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="text-muted-foreground">{bucket.label}</span>
              <span className="font-medium tabular-nums">{formatCurrency(bucket.value, "USD")}</span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label={`${bucket.label}: ${formatCurrency(bucket.value, "USD")}`}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: bucketColor(index, buckets.length) }}
                initial={reducedMotion ? false : { width: 0 }}
                animate={{ width: `${share}%` }}
                transition={{ duration: 0.7, delay: index * 0.07, ease: "easeOut" }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
