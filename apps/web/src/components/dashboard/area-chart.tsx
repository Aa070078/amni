"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useId, useRef, useState } from "react";
import type { DashboardSeriesPoint } from "@amni/shared";
import { areaPath, buildPoints, formatCompact, gridTicks, niceDomain, smoothPath } from "@/src/lib/chart";

const WIDTH = 600;
const PAD = 6;
const TOOLTIP_WIDTH = 116;
const TOOLTIP_HEIGHT = 42;

interface AreaChartProps {
  data: DashboardSeriesPoint[];
  height?: number;
  variant?: "full" | "sparkline";
  formatValue?: (value: number) => string;
  formatTick?: (value: number) => string;
  ariaLabel: string;
}

export function AreaChart({
  data,
  height = 220,
  variant = "full",
  formatValue = (value) => formatCompact(value),
  formatTick = (value) => formatCompact(value),
  ariaLabel,
}: AreaChartProps) {
  const sparkline = variant === "sparkline";
  const reducedMotion = useReducedMotion();
  const gradientId = useId().replace(/:/g, "");
  const svgRef = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<number | null>(null);

  const values = data.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const domain = niceDomain(min, max, 4);
  const points = buildPoints(values, WIDTH, height, domain, PAD);
  const line = smoothPath(points);
  const area = areaPath(points, height, PAD);
  const ticks = gridTicks(domain);

  const labelStep = Math.max(1, Math.ceil(data.length / 6));

  function handleMove(event: React.PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || data.length === 0) return;
    const x = ((event.clientX - rect.left) / rect.width) * WIDTH;
    const index = Math.round((x / WIDTH) * (data.length - 1));
    setActive(Math.max(0, Math.min(data.length - 1, index)));
  }

  const activePoint = active !== null ? points[active] : undefined;
  const activeData = active !== null ? data[active] : undefined;

  return (
    <div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${height}`}
        role="img"
        aria-label={ariaLabel}
        className="w-full select-none"
        onPointerMove={handleMove}
        onPointerLeave={() => setActive(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {!sparkline ? (
          <>
            {ticks.map((tick) => {
              const y = PAD + (1 - (tick - domain.min) / (domain.max - domain.min)) * (height - PAD * 2);
              return (
                <g key={tick}>
                  <line x1={0} x2={WIDTH} y1={y} y2={y} stroke="var(--border)" strokeOpacity={0.7} />
                  <text x={PAD} y={y - 4} fontSize={10} fill="var(--muted-foreground)">
                    {formatTick(tick)}
                  </text>
                </g>
              );
            })}

            {data.map((point, index) =>
              index % labelStep === 0 ? (
                <text key={point.label} x={points[index]?.x ?? 0} y={height - 2} fontSize={10} textAnchor="middle" fill="var(--muted-foreground)">
                  {point.label}
                </text>
              ) : null,
            )}
          </>
        ) : null}

        {area ? (
          <motion.path
            d={area}
            fill={`url(#${gradientId})`}
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          />
        ) : null}

        {line ? (
          <motion.path
            d={line}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reducedMotion ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, delay: 0.1, ease: "easeInOut" }}
          />
        ) : null}

        {!sparkline && points.length > 0 ? (
          <circle
            cx={points[points.length - 1]?.x}
            cy={points[points.length - 1]?.y}
            r={4}
            fill="var(--primary)"
            stroke="var(--card)"
            strokeWidth={2}
            pointerEvents="none"
          />
        ) : null}

        {activePoint && activeData ? (
          <g pointerEvents="none">
            <line
              x1={activePoint.x}
              x2={activePoint.x}
              y1={PAD}
              y2={height - PAD}
              stroke="var(--muted-foreground)"
              strokeOpacity={0.35}
            />
            <circle cx={activePoint.x} cy={activePoint.y} r={5} fill="var(--primary)" stroke="var(--card)" strokeWidth={2} />
            <g
              transform={`translate(${Math.max(0, Math.min(WIDTH - TOOLTIP_WIDTH, activePoint.x - TOOLTIP_WIDTH / 2))}, ${Math.max(0, activePoint.y - TOOLTIP_HEIGHT - 14)})`}
            >
              <rect width={TOOLTIP_WIDTH} height={TOOLTIP_HEIGHT} rx={6} fill="var(--foreground)" opacity={0.92} />
              <text x={TOOLTIP_WIDTH / 2} y={17} fontSize={10} textAnchor="middle" fill="var(--card)">
                {activeData.label}
              </text>
              <text x={TOOLTIP_WIDTH / 2} y={32} fontSize={12} fontWeight={600} textAnchor="middle" fill="var(--card)">
                {formatValue(activeData.value)}
              </text>
            </g>
          </g>
        ) : null}
      </svg>

      <ul className="sr-only">
        {data.map((point) => (
          <li key={point.label}>
            {point.label}: {formatValue(point.value)}
          </li>
        ))}
      </ul>
    </div>
  );
}
