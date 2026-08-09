"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileBarChart, Hash } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Progress, Skeleton } from "@amni/ui";
import { AmniApiError } from "@/src/lib/client";
import { esgClient } from "@/src/lib/esg";
import { EsgReportStatusBadge } from "./esg-status";

interface EsgReportDetailViewProps {
  code: string;
}

export function EsgReportDetailView({ code }: EsgReportDetailViewProps) {
  const detailQuery = useQuery({
    queryKey: ["esg", "reports", code],
    queryFn: () => esgClient.reportDetail(code),
    retry: (failureCount, error) => {
      if (error instanceof AmniApiError && error.status === 404) return false;
      return failureCount < 2;
    },
  });

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
          <FileBarChart className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-base font-semibold">
              {is404 ? "Report not found" : "Couldn&apos;t load this report"}
            </p>
            <p className="text-sm text-muted-foreground">
              {is404
                ? `No report matches ${code}. It may have been removed.`
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

  const report = detailQuery.data;
  if (!report) return null;

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
              <h1 className="text-xl font-semibold tracking-tight">{report.code}</h1>
              <EsgReportStatusBadge status={report.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Period {report.period}</p>
          </div>

          <div className="flex shrink-0 items-end gap-6 text-right">
            <div>
              <p className="text-xs text-muted-foreground">Overall score</p>
              <p className="text-3xl font-semibold tabular-nums tracking-tight">
                {report.pillarScore.overall.toFixed(1)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Hash className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Scores
            </CardTitle>
            <CardDescription>Pillar scores for this reporting period.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScoreBar label="Environmental" value={report.pillarScore.environmental} />
            <ScoreBar label="Social" value={report.pillarScore.social} />
            <ScoreBar label="Governance" value={report.pillarScore.governance} />
            <ScoreBar label="Overall" value={report.pillarScore.overall} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileBarChart className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Highlights
            </CardTitle>
            <CardDescription>Key achievements covered in this report.</CardDescription>
          </CardHeader>
          <CardContent>
            {report.highlights.length > 0 ? (
              <ul className="space-y-2">
                {report.highlights.map((highlight, index) => (
                  <li key={`${highlight}-${index}`} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    {highlight}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No highlights recorded.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums text-foreground">{value.toFixed(1)}/100</span>
      </div>
      <Progress value={value} aria-label={`${label} score`} />
    </div>
  );
}
