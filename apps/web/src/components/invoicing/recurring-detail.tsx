"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardX,
  Hash,
  Pause,
  Play,
  Repeat,
  StickyNote,
} from "lucide-react";
import { RECURRING_PROFILE_STATUSES } from "@amni/shared";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@amni/ui";
import { formatCurrency } from "@/src/lib/format";
import { AmniApiError } from "@/src/lib/client";
import { invoicingClient } from "@/src/lib/invoicing";
import { RecurringStatusBadge } from "./recurring-status";

interface RecurringDetailViewProps {
  code: string;
}

export function RecurringDetailView({ code }: RecurringDetailViewProps) {
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ["invoicing", "recurring", code],
    queryFn: () => invoicingClient.recurringDetail(code),
    retry: (failureCount, error) => {
      if (error instanceof AmniApiError && error.status === 404) return false;
      return failureCount < 2;
    },
  });

  const changeStatus = useMutation({
    mutationFn: (status: "active" | "paused" | "ended") => invoicingClient.changeRecurringStatus(code, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["invoicing", "recurring", code] });
      void queryClient.invalidateQueries({ queryKey: ["invoicing", "recurring"] });
      void queryClient.invalidateQueries({ queryKey: ["invoicing", "overview"] });
    },
  });

  const removeProfile = useMutation({
    mutationFn: () => invoicingClient.removeRecurring(code),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["invoicing", "recurring"] });
      window.location.assign("/finance/invoicing");
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
          <Repeat className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-base font-semibold">
              {is404 ? "Profile not found" : "Couldn&apos;t load this profile"}
            </p>
            <p className="text-sm text-muted-foreground">
              {is404
                ? `No recurring profile matches ${code}. It may have been removed.`
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
              <Link href="/finance/invoicing">
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Back to invoicing
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const profile = detailQuery.data;
  if (!profile) return null;

  const intervalLabel =
    RECURRING_PROFILE_STATUSES.find((entry) => entry.value === profile.status)?.label ?? profile.status;

  return (
    <div className="space-y-6">
      <Link
        href="/finance/invoicing"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Invoicing
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{profile.name}</h1>
              <RecurringStatusBadge status={profile.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {profile.customer.name} · {profile.interval} · day {profile.dayOfPeriod}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>
                Next run {new Date(profile.nextRun).toLocaleDateString()}
                {profile.lastRun ? ` · Last ${new Date(profile.lastRun).toLocaleDateString()}` : ""}
              </span>
              <span className="tabular-nums">{profile.currency}</span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:items-end">
            <span className="text-2xl font-semibold tabular-nums tracking-tight">
              {formatCurrency(profile.summary.total, profile.currency)}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {profile.status === "active" ? (
                <Button
                  variant="outline"
                  disabled={changeStatus.isPending}
                  onClick={() => changeStatus.mutate("paused")}
                >
                  <Pause className="mr-2 h-4 w-4" aria-hidden="true" />
                  Pause
                </Button>
              ) : profile.status === "paused" ? (
                <Button
                  variant="outline"
                  disabled={changeStatus.isPending}
                  onClick={() => changeStatus.mutate("active")}
                >
                  <Play className="mr-2 h-4 w-4" aria-hidden="true" />
                  Resume
                </Button>
              ) : null}
              <Button
                variant="outline"
                disabled={removeProfile.isPending}
                onClick={() => {
                  if (window.confirm(`Delete ${profile.code}? This cannot be undone.`)) removeProfile.mutate();
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
                <StickyNote className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Line items
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="w-20 text-right">Qty</TableHead>
                    <TableHead className="w-28 text-right">Rate</TableHead>
                    <TableHead className="w-32 text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profile.items.map((line) => (
                    <TableRow key={line.lineNo}>
                      <TableCell className="text-foreground">{line.name}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{line.qty}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatCurrency(line.rate, profile.currency)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-foreground">
                        {formatCurrency(line.amount, profile.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell className="font-medium text-foreground">Total</TableCell>
                    <TableCell />
                    <TableCell />
                    <TableCell className="text-right font-semibold tabular-nums text-foreground">
                      {formatCurrency(profile.summary.total, profile.currency)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Hash className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DetailRow icon={CalendarDays} label="Interval" value={`${profile.interval} · day ${profile.dayOfPeriod}`} />
              <DetailRow icon={Hash} label="Customer" value={profile.customer.name} />
              <DetailRow icon={CalendarDays} label="Next run" value={new Date(profile.nextRun).toLocaleDateString()} />
              <DetailRow icon={CalendarDays} label="Last run" value={profile.lastRun ? new Date(profile.lastRun).toLocaleDateString() : "—"} />
              <DetailRow icon={Hash} label="Status" value={intervalLabel} />
            </CardContent>
          </Card>
        </div>
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
