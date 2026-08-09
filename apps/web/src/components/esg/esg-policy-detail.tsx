"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Hash, ScrollText } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from "@amni/ui";
import { AmniApiError } from "@/src/lib/client";
import { esgClient } from "@/src/lib/esg";
import { EsgPolicyStatusBadge } from "./esg-status";

interface EsgPolicyDetailViewProps {
  code: string;
}

export function EsgPolicyDetailView({ code }: EsgPolicyDetailViewProps) {
  const detailQuery = useQuery({
    queryKey: ["esg", "policies", code],
    queryFn: () => esgClient.policyDetail(code),
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
          <ScrollText className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-base font-semibold">
              {is404 ? "Policy not found" : "Couldn&apos;t load this policy"}
            </p>
            <p className="text-sm text-muted-foreground">
              {is404
                ? `No policy matches ${code}. It may have been removed.`
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

  const policy = detailQuery.data;
  if (!policy) return null;

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
              <h1 className="text-xl font-semibold tracking-tight">{policy.name}</h1>
              <EsgPolicyStatusBadge status={policy.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{policy.code}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Hash className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Review schedule
          </CardTitle>
          <CardDescription>When this policy was last reviewed and when it is due again.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DetailRow
            icon={CalendarDays}
            label="Last reviewed"
            value={policy.lastReviewed ? new Date(policy.lastReviewed).toLocaleDateString() : "Never"}
          />
          <DetailRow
            icon={CalendarDays}
            label="Next review"
            value={policy.nextReview ? new Date(policy.nextReview).toLocaleDateString() : "—"}
          />
          <DetailRow icon={Hash} label="Status" value={POLICY_STATUS_LABELS[policy.status]} />
        </CardContent>
      </Card>
    </div>
  );
}

const POLICY_STATUS_LABELS = {
  active: "Active",
  under_review: "Under review",
  draft: "Draft",
} as const;

function DetailRow({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
}
