export interface ChartPoint {
  x: number;
  y: number;
}

export interface Domain {
  min: number;
  max: number;
  step: number;
}

function niceStep(value: number): number {
  const safe = Math.max(1e-9, value);
  const pow = Math.pow(10, Math.floor(Math.log10(safe)));
  const n = safe / pow;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return nice * pow;
}

export function niceDomain(min: number, max: number, targetTicks = 4): Domain {
  const range = Math.max(1, max - min);
  const step = niceStep(range / Math.max(1, targetTicks));
  return {
    min: Math.floor(min / step) * step,
    max: Math.ceil(max / step) * step,
    step,
  };
}

export function buildPoints(values: number[], width: number, height: number, domain: Domain, pad = 4): ChartPoint[] {
  if (values.length === 0) return [];
  const span = Math.max(1, domain.max - domain.min);
  const xStep = width / (values.length - 1);
  return values.map((value, index) => ({
    x: index * xStep,
    y: pad + (1 - (value - domain.min) / span) * (height - pad * 2),
  }));
}

export function gridTicks(domain: Domain): number[] {
  const ticks: number[] = [];
  for (let value = domain.min; value <= domain.max + domain.step / 2; value += domain.step) {
    ticks.push(Math.round(value * 100) / 100);
  }
  return ticks;
}

export function linePath(points: ChartPoint[]): string {
  if (points.length === 0) return "";
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
}

export function smoothPath(points: ChartPoint[]): string {
  if (points.length < 2) return "";
  return points.reduce((acc, point, index, all) => {
    if (index === 0) return `M${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    const prev = all[index - 1];
    if (!prev) return acc;
    const midX = (prev.x + point.x) / 2;
    return `${acc} C${midX.toFixed(2)} ${prev.y.toFixed(2)},${midX.toFixed(2)} ${point.y.toFixed(2)},${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
  }, "");
}

export function areaPath(points: ChartPoint[], height: number, pad = 4): string {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last || points.length < 2) return "";
  const baselineY = height - pad;
  return `${smoothPath(points)} L${last.x.toFixed(2)} ${baselineY.toFixed(2)} L${first.x.toFixed(2)} ${baselineY.toFixed(2)} Z`;
}

export function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}
