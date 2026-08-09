"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ClipboardX, Hash, Layers, Scale } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from "@amni/ui";
import { formatCurrency, formatNumber } from "@/src/lib/format";
import { AmniApiError } from "@/src/lib/client";
import { equityClient } from "@/src/lib/equity";
import { ShareClassStatusBadge } from "./equity-status";

interface ShareClassDetailViewProps {
  code: string;
}

export function ShareClassDetailView({ code }: ShareClassDetailViewProps) {
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ["equity", "classes", code],
    queryFn: () => equityClient.classDetail(code),
    retry: (failureCount, error) => {
      if (error instanceof AmniApiError && error.status === 404) return false;
      return failureCount < 2;
    },
  });

  const archiveClass = useMutation({
    mutationFn: () => equityClient.changeClassStatus(code, "archived"),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["equity", "classes", code] });
      void queryClient.invalidateQueries({ queryKey: ["equity", "classes"] });
      void queryClient.invalidateQueries({ queryKey: ["equity", "overview"] });
    },
  });

  const removeClass = useMutation({
    mutationFn: () => equityClient.removeClass(code),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["equity", "classes"] });
      void queryClient.invalidateQueries({ queryKey: ["equity", "cap-table"] });
      void queryClient.invalidateQueries({ queryKey: ["equity", "overview"] });
      window.location.assign("/finance/equity");
    },
  });

  if (detailQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (detailQuery.isError) {
    const is404 = detailQuery.error instanceof AmniApiError && detailQuery.error.status === 404;
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
          <Layers className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-base font-semibold">
              {is404 ? "Share class not found" : "Couldn&apos;t load this share class"}
            </p>
            <p className="text-sm text-muted-foreground">
              {is404
                ? `No share class matches ${code}. It may have been removed.`
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
              <Link href="/finance/equity">
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Back to equity
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const shareClass = detailQuery.data;
  if (!shareClass) return null;

  const isActive = shareClass.status === "active";

  return (
    <div className="space-y-6">
      <Link
        href="/finance/equity"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Equity
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{shareClass.name}</h1>
              <ShareClassStatusBadge status={shareClass.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{shareClass.code}</p>
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:items-end">
            <div className="flex flex-wrap items-center gap-4 text-right">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-semibold tabular-nums tracking-tight">{formatNumber(shareClass.totalShares)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Outstanding</p>
                <p className="text-xl font-semibold tabular-nums tracking-tight">
                  {formatNumber(shareClass.outstandingShares)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isActive ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={archiveClass.isPending}
                  onClick={() => {
                    if (window.confirm(`Archive ${shareClass.code}?`)) archiveClass.mutate();
                  }}
                >
                  Archive
                </Button>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                disabled={removeClass.isPending}
                onClick={() => {
                  if (window.confirm(`Delete ${shareClass.code}? This cannot be undone.`)) removeClass.mutate();
                }}
              >
                <ClipboardX className="mr-2 h-4 w-4" aria-hidden="true" />
                Delete
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Details
          </CardTitle>
          <CardDescription>Terms and history for this class.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <DetailValue label="Price per share" value={formatCurrency(shareClass.pricePerShare, "USD")} />
          <DetailValue label="Voting" value={shareClass.voting ? "Voting" : "Non-voting"} />
          <DetailValue
            label="Liquidation preference"
            value={
              shareClass.liquidationPreference !== undefined && shareClass.liquidationPreference !== null
                ? formatCurrency(shareClass.liquidationPreference, "USD")
                : "—"
            }
          />
          <DetailValue label="Created" value={new Date(shareClass.createdAt).toLocaleDateString()} />
          <DetailValue label="Last updated" value={new Date(shareClass.updatedAt).toLocaleDateString()} />
        </CardContent>
      </Card>
    </div>
  );
}

function DetailValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Hash className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="truncate text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
}
