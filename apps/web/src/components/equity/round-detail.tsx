"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, ClipboardX, Coins, Hash, StickyNote, Users } from "lucide-react";
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
import { RoundStatusBadge, RoundTypeBadge } from "./equity-status";

interface RoundDetailViewProps {
  code: string;
}

export function RoundDetailView({ code }: RoundDetailViewProps) {
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ["equity", "rounds", code],
    queryFn: () => equityClient.roundDetail(code),
    retry: (failureCount, error) => {
      if (error instanceof AmniApiError && error.status === 404) return false;
      return failureCount < 2;
    },
  });

  const closeRound = useMutation({
    mutationFn: () => equityClient.changeRoundStatus(code, "closed"),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["equity", "rounds", code] });
      void queryClient.invalidateQueries({ queryKey: ["equity", "rounds"] });
      void queryClient.invalidateQueries({ queryKey: ["equity", "overview"] });
    },
  });

  const removeRound = useMutation({
    mutationFn: () => equityClient.removeRound(code),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["equity", "rounds"] });
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
          <Coins className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-base font-semibold">
              {is404 ? "Round not found" : "Couldn&apos;t load this round"}
            </p>
            <p className="text-sm text-muted-foreground">
              {is404
                ? `No round matches ${code}. It may have been removed.`
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

  const round = detailQuery.data;
  if (!round) return null;

  const isOpen = round.status !== "closed";

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
              <h1 className="text-xl font-semibold tracking-tight">{round.name}</h1>
              <RoundStatusBadge status={round.status} />
              <RoundTypeBadge type={round.type} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{round.code}</p>
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:items-end">
            <div className="flex flex-wrap items-center gap-4 text-right">
              <div>
                <p className="text-xs text-muted-foreground">Raised</p>
                <p className="text-xl font-semibold tabular-nums tracking-tight">
                  {formatCurrency(round.amountRaised, "USD")}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Post-money</p>
                <p className="text-xl font-semibold tabular-nums tracking-tight">{formatCurrency(round.postMoney, "USD")}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isOpen ? (
                <Button variant="outline" size="sm" disabled={closeRound.isPending} onClick={() => closeRound.mutate()}>
                  Close round
                </Button>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                disabled={removeRound.isPending}
                onClick={() => {
                  if (window.confirm(`Delete ${round.code}? This cannot be undone.`)) removeRound.mutate();
                }}
              >
                <ClipboardX className="mr-2 h-4 w-4" aria-hidden="true" />
                Delete
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Investors
              </CardTitle>
              <CardDescription>Participants in this round.</CardDescription>
            </CardHeader>
            <CardContent>
              {round.investors.length > 0 ? (
                <ul className="space-y-2">
                  {round.investors.map((investor) => (
                    <li
                      key={investor}
                      className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-foreground"
                    >
                      <Users className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      {investor}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No investors recorded.</p>
              )}
            </CardContent>
          </Card>

          {round.notes ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <StickyNote className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{round.notes}</p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Hash className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailRow icon={CalendarDays} label="Announced" value={new Date(round.announcedDate).toLocaleDateString()} />
            <DetailRow
              icon={CalendarDays}
              label="Closed"
              value={round.closedDate ? new Date(round.closedDate).toLocaleDateString() : "—"}
            />
            <DetailRow icon={Hash} label="Pre-money" value={formatCurrency(round.preMoney, "USD")} />
            <DetailRow icon={Hash} label="Post-money" value={formatCurrency(round.postMoney, "USD")} />
            <DetailRow icon={Hash} label="Valuation" value={formatCurrency(round.valuation, "USD")} />
            <DetailRow icon={Hash} label="Shares issued" value={formatNumber(round.sharesIssued)} />
            <DetailRow icon={Hash} label="Created" value={new Date(round.createdAt).toLocaleDateString()} />
            <DetailRow icon={Hash} label="Last updated" value={new Date(round.updatedAt).toLocaleDateString()} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="truncate text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
}
