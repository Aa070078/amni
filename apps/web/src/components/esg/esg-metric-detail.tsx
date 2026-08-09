"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Gauge, Hash } from "lucide-react";
import { useMemo } from "react";
import type { EsgPillar } from "@amni/shared";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from "@amni/ui";
import { formatNumber } from "@/src/lib/format";
import { AmniApiError } from "@/src/lib/client";
import { esgClient } from "@/src/lib/esg";
import { EsgPillarBadge } from "./esg-status";

interface EsgMetricDetailViewProps {
  code: string;
}

export function EsgMetricDetailView({ code }: EsgMetricDetailViewProps) {
  const detailQuery = useQuery({
    queryKey: ["esg", "metrics", code],
    queryFn: () => esgClient.metricDetail(code),
    retry: (failureCount, error) => {
      if (error instanceof AmniApiError && error.status === 404) return false;
      return failureCount < 2;
    },
  });

  const progress = useMemo(() => {
    const metric = detailQuery.data;
    if (!metric || metric.target === undefined || metric.target === null || metric.target === 0) return null;
    return Math.min(100, Math.max(0, (metric.value / metric.target) * 100));
  }, [detailQuery.data]);

  if (detailQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
    );
  }

  if (detailQuery.isError) {
    const is404 = detailQuery.error instanceof AmniApiError && detailQuery.error.status === 404;
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
          <Gauge className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-base font-semibold">
              {is404 ? "Metric not found" : "Couldn&apos;t load this metric"}
            </p>
            <p className="text-sm text-muted-foreground">
              {is404
                ? `No metric matches ${code}. It may have been removed.`
                : "Something went wrong. Please try again."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!is404 ? (
              <Button variant="outline" onClick={() => void detailQuery.refetch()}>
                Retry
              </Button>
            ) : null}
            <Button asChild variant={is404 ? "default" : "outline"}>
              <Link href="/finance/esg">
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Back to ESG
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const metric = detailQuery.data;
  if (!metric) return null;

  return (
    <div className="space-y-6">
      <Link
        href="/finance/esg"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        ESG
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{metric.name}</h1>
              <EsgPillarBadge pillar={metric.pillar as EsgPillar} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{metric.code}</p>
          </div>

          <div className="flex shrink-0 items-end gap-6 text-right">
            <div>
              <p className="text-xs text-muted-foreground">Current</p>
              <p className="text-xl font-semibold tabular-nums tracking-tight">
                {formatNumber(metric.value)} {metric.unit}
              </p>
            </div>
            {progress !== null ? (
              <div>
                <p className="text-xs text-muted-foreground">Target progress</p>
                <p className="text-xl font-semibold tabular-nums tracking-tight">{progress.toFixed(1)}%</p>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Hash className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Details
          </CardTitle>
          <CardDescription>Reporting period and target for this metric.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <DetailValue label="Pillar" value={(ESG_PILLAR_LABELS as Record<string, string>)[metric.pillar] ?? metric.pillar} />
          <DetailValue label="Period" value={metric.period} />
          <DetailValue
            label="Target"
            value={
              metric.target !== undefined && metric.target !== null
                ? `${formatNumber(metric.target)} ${metric.unit}`
                : "—"
            }
          />
          <DetailValue label="Status" value={METRIC_STATUS_LABELS[metric.status] ?? metric.status} />
          <DetailValue label="Trend" value={metric.trend ? metric.trend.charAt(0).toUpperCase() + metric.trend.slice(1) : "—"} />
        </CardContent>
      </Card>
    </div>
  );
}

const ESG_PILLAR_LABELS = {
  environmental: "Environmental",
  social: "Social",
  governance: "Governance",
} as const;

const METRIC_STATUS_LABELS = {
  on_track: "On track",
  behind: "Behind",
  na: "N/A",
} as const;

function DetailValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}
