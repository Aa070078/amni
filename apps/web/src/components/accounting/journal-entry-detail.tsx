"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardX,
  Hash,
  NotebookPen,
  Send,
  StickyNote,
} from "lucide-react";
import { JOURNAL_ENTRY_STATUSES, type JournalEntryStatus } from "@amni/shared";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
import { JournalEntryStatusBadge } from "./accounting-status";

interface JournalEntryDetailViewProps {
  code: string;
}

export function JournalEntryDetailView({ code }: JournalEntryDetailViewProps) {
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ["accounting", "journal", code],
    queryFn: () => accountingClient.journalEntryDetail(code),
    retry: (failureCount, error) => {
      if (error instanceof AmniApiError && error.status === 404) return false;
      return failureCount < 2;
    },
  });

  const changeStatus = useMutation({
    mutationFn: (status: JournalEntryStatus) => accountingClient.changeJournalEntryStatus(code, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["accounting", "journal", code] });
      void queryClient.invalidateQueries({ queryKey: ["accounting", "journal"] });
      void queryClient.invalidateQueries({ queryKey: ["accounting", "trial-balance"] });
    },
  });

  const removeEntry = useMutation({
    mutationFn: () => accountingClient.removeJournalEntry(code),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["accounting", "journal"] });
      window.location.assign("/finance/accounting");
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
          <NotebookPen className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-base font-semibold">
              {is404 ? "Journal entry not found" : "Couldn&apos;t load this journal entry"}
            </p>
            <p className="text-sm text-muted-foreground">
              {is404
                ? `No journal entry matches ${code}. It may have been removed.`
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

  const entry = detailQuery.data;
  if (!entry) return null;

  const isDraft = entry.status === "draft";

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
              <h1 className="text-xl font-semibold tracking-tight">{entry.code}</h1>
              <JournalEntryStatusBadge status={entry.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{entry.memo}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>{new Date(entry.date).toLocaleDateString()}</span>
              {entry.referenceCode ? (
                <span>
                  {entry.referenceType ?? "Reference"} {entry.referenceCode}
                </span>
              ) : null}
              {entry.createdBy ? <span>{entry.createdBy}</span> : null}
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:items-end">
            <div className="flex flex-wrap items-center gap-2">
              {isDraft ? (
                <Button disabled={changeStatus.isPending} onClick={() => changeStatus.mutate("posted")}>
                  <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                  Post entry
                </Button>
              ) : null}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={changeStatus.isPending}>
                    <ChevronDown className="mr-2 h-4 w-4" aria-hidden="true" />
                    Change status
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Set status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {JOURNAL_ENTRY_STATUSES.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      disabled={option.value === entry.status || changeStatus.isPending}
                      onClick={() => changeStatus.mutate(option.value)}
                    >
                      {option.value === entry.status ? (
                        <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                      ) : (
                        <span className="mr-2 inline-block w-4" aria-hidden="true" />
                      )}
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {isDraft ? (
                <Button
                  variant="outline"
                  disabled={removeEntry.isPending}
                  onClick={() => {
                    if (window.confirm(`Delete ${entry.code}? This cannot be undone.`)) removeEntry.mutate();
                  }}
                >
                  <ClipboardX className="mr-2 h-4 w-4" aria-hidden="true" />
                  Delete
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <NotebookPen className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Lines
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead className="w-28 text-right">Debit</TableHead>
                    <TableHead className="w-28 text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entry.entries.map((line, index) => (
                    <TableRow key={`${line.accountCode}-${index}`}>
                      <TableCell>
                        <span className="tabular-nums text-muted-foreground">{line.accountCode}</span>{" "}
                        <span className="text-foreground">{line.accountName}</span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {line.debit !== 0 ? formatCurrency(line.debit, "USD") : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {line.credit !== 0 ? formatCurrency(line.credit, "USD") : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell className="font-medium text-foreground">Total</TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-foreground">
                      {formatCurrency(
                        entry.entries.reduce((sum, line) => sum + line.debit, 0),
                        "USD",
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-foreground">
                      {formatCurrency(
                        entry.entries.reduce((sum, line) => sum + line.credit, 0),
                        "USD",
                      )}
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
              <DetailRow icon={CalendarDays} label="Date" value={new Date(entry.date).toLocaleDateString()} />
              <DetailRow icon={Hash} label="Reference" value={entry.referenceCode ?? "—"} />
              <DetailRow icon={Hash} label="Posted at" value={entry.postedAt ? new Date(entry.postedAt).toLocaleString() : "—"} />
              <DetailRow icon={Hash} label="Created by" value={entry.createdBy ?? "—"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <StickyNote className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Memo
              </CardTitle>
              <CardDescription>Why this entry was recorded.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{entry.memo}</p>
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
