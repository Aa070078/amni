"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, ClipboardX, Coins, Hash, UserRound, Wallet } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
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
import { formatCurrency, formatNumber } from "@/src/lib/format";
import { AmniApiError } from "@/src/lib/client";
import { equityClient } from "@/src/lib/equity";
import { ShareholderTypeBadge } from "./equity-status";

interface ShareholderDetailViewProps {
  code: string;
}

export function ShareholderDetailView({ code }: ShareholderDetailViewProps) {
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ["equity", "shareholders", code],
    queryFn: () => equityClient.shareholderDetail(code),
    retry: (failureCount, error) => {
      if (error instanceof AmniApiError && error.status === 404) return false;
      return failureCount < 2;
    },
  });

  const removeShareholder = useMutation({
    mutationFn: () => equityClient.removeShareholder(code),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["equity", "shareholders"] });
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
          <UserRound className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-base font-semibold">
              {is404 ? "Shareholder not found" : "Couldn&apos;t load this shareholder"}
            </p>
            <p className="text-sm text-muted-foreground">
              {is404
                ? `No shareholder matches ${code}. It may have been removed.`
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

  const shareholder = detailQuery.data;
  if (!shareholder) return null;

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
              <h1 className="text-xl font-semibold tracking-tight">{shareholder.name}</h1>
              <ShareholderTypeBadge type={shareholder.type} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{shareholder.code}</p>
            {shareholder.email ? <p className="mt-1 text-sm text-muted-foreground">{shareholder.email}</p> : null}
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:items-end">
            <div className="flex flex-wrap items-center gap-4 text-right">
              <div>
                <p className="text-xs text-muted-foreground">Total shares</p>
                <p className="text-xl font-semibold tabular-nums tracking-tight">{formatNumber(shareholder.totalShares)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Invested</p>
                <p className="text-xl font-semibold tabular-nums tracking-tight">
                  {formatCurrency(shareholder.investedAmount, "USD")}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={removeShareholder.isPending}
              onClick={() => {
                if (window.confirm(`Remove ${shareholder.code}? This cannot be undone.`)) removeShareholder.mutate();
              }}
            >
              <ClipboardX className="mr-2 h-4 w-4" aria-hidden="true" />
              Remove
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Holdings
              </CardTitle>
              <CardDescription>Shares held by class.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class</TableHead>
                    <TableHead className="w-32 text-right">Shares</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shareholder.holdings.map((holding) => (
                    <TableRow key={holding.classCode}>
                      <TableCell>
                        <Link
                          href={`/finance/equity/classes/${holding.classCode}`}
                          className="tabular-nums text-foreground hover:text-primary hover:underline"
                        >
                          {holding.classCode}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums text-foreground">
                        {formatNumber(holding.shares)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell className="font-medium text-foreground">Total</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-foreground">
                      {formatNumber(shareholder.totalShares)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Coins className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailRow icon={CalendarDays} label="Joined" value={shareholder.joinedAt ? new Date(shareholder.joinedAt).toLocaleDateString() : "—"} />
            <DetailRow icon={Hash} label="Created" value={new Date(shareholder.createdAt).toLocaleDateString()} />
            <DetailRow icon={Hash} label="Last updated" value={new Date(shareholder.updatedAt).toLocaleDateString()} />
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
