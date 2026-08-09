"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, CalendarDays, Hash } from "lucide-react";
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
import { accountingClient } from "@/src/lib/accounting";
import { AccountTypeBadge } from "./accounting-status";

interface AccountDetailViewProps {
  code: string;
}

export function AccountDetailView({ code }: AccountDetailViewProps) {
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ["accounting", "accounts", code],
    queryFn: () => accountingClient.accountDetail(code),
    retry: (failureCount, error) => {
      if (error instanceof AmniApiError && error.status === 404) return false;
      return failureCount < 2;
    },
  });

  const ledgerQuery = useQuery({
    queryKey: ["accounting", "ledger", code],
    queryFn: () => accountingClient.ledger(code),
    enabled: detailQuery.isSuccess,
    retry: (failureCount, error) => {
      if (error instanceof AmniApiError && error.status === 404) return false;
      return failureCount < 2;
    },
  });

  const archiveAccount = useMutation({
    mutationFn: () => accountingClient.changeAccountStatus(code, "archived"),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["accounting", "accounts", code] });
      void queryClient.invalidateQueries({ queryKey: ["accounting", "accounts"] });
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
          <BookOpen className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-base font-semibold">
              {is404 ? "Account not found" : "Couldn&apos;t load this account"}
            </p>
            <p className="text-sm text-muted-foreground">
              {is404
                ? `No account matches ${code}. It may have been removed.`
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
              <Link href="/finance/accounting">
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Back to accounting
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const account = detailQuery.data;
  if (!account) return null;
  const ledger = ledgerQuery.data;

  return (
    <div className="space-y-6">
      <Link
        href="/finance/accounting"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Accounting
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{account.name}</h1>
              <AccountTypeBadge type={account.type} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {account.code} · {account.group}
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:items-end">
            <span className="text-2xl font-semibold tabular-nums tracking-tight">
              {formatCurrency(account.balance, account.currency)}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={archiveAccount.isPending}
              onClick={() => {
                if (window.confirm(`Archive ${account.code}?`)) archiveAccount.mutate();
              }}
            >
              Archive
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Hash className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Ledger
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {ledgerQuery.isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-8" />
              ))}
            </div>
          ) : ledger && ledger.movements.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Entry</TableHead>
                  <TableHead>Memo</TableHead>
                  <TableHead className="w-28 text-right">Debit</TableHead>
                  <TableHead className="w-28 text-right">Credit</TableHead>
                  <TableHead className="w-32 text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledger.movements.map((movement) => (
                  <TableRow key={`${movement.entryCode}-${movement.date}`}>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {new Date(movement.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="tabular-nums text-foreground">{movement.entryCode}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">{movement.memo}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {movement.debit !== 0 ? formatCurrency(movement.debit, account.currency) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {movement.credit !== 0 ? formatCurrency(movement.credit, account.currency) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-foreground">
                      {formatCurrency(movement.balance, account.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-medium text-foreground">Opening</TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell />
                  <TableCell />
                  <TableCell className="text-right font-medium tabular-nums text-foreground">
                    {formatCurrency(ledger.openingBalance, account.currency)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-foreground">Closing</TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell />
                  <TableCell />
                  <TableCell className="text-right font-semibold tabular-nums text-foreground">
                    {formatCurrency(ledger.closingBalance, account.currency)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          ) : (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <CalendarDays className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm font-medium">No ledger movements</p>
              <p className="text-sm text-muted-foreground">Post journal entries to see activity on this account.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
