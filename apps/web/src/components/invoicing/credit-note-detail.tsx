"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardX,
  FileMinus,
  Hash,
  StickyNote,
} from "lucide-react";
import { CREDIT_NOTE_STATUSES, type CreditNoteStatus } from "@amni/shared";
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
import { invoicingClient } from "@/src/lib/invoicing";
import { CreditNoteStatusBadge } from "./credit-note-status";

interface CreditNoteDetailViewProps {
  code: string;
}

export function CreditNoteDetailView({ code }: CreditNoteDetailViewProps) {
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ["invoicing", "credit-notes", code],
    queryFn: () => invoicingClient.creditNoteDetail(code),
    retry: (failureCount, error) => {
      if (error instanceof AmniApiError && error.status === 404) return false;
      return failureCount < 2;
    },
  });

  const changeStatus = useMutation({
    mutationFn: (status: CreditNoteStatus) => invoicingClient.changeCreditNoteStatus(code, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["invoicing", "credit-notes", code] });
      void queryClient.invalidateQueries({ queryKey: ["invoicing", "credit-notes"] });
      void queryClient.invalidateQueries({ queryKey: ["invoicing", "overview"] });
    },
  });

  const removeNote = useMutation({
    mutationFn: () => invoicingClient.removeCreditNote(code),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["invoicing", "credit-notes"] });
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
          <FileMinus className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-base font-semibold">
              {is404 ? "Credit note not found" : "Couldn&apos;t load this credit note"}
            </p>
            <p className="text-sm text-muted-foreground">
              {is404
                ? `No credit note matches ${code}. It may have been removed.`
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

  const note = detailQuery.data;
  if (!note) return null;

  const canEdit = note.status === "draft";

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
              <h1 className="text-xl font-semibold tracking-tight">{note.code}</h1>
              <CreditNoteStatusBadge status={note.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Against invoice {note.invoiceCode} · {note.customer.name}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>Issued {new Date(note.date).toLocaleDateString()}</span>
              <span className="tabular-nums">{note.currency}</span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:items-end">
            <span className="text-2xl font-semibold tabular-nums tracking-tight">
              {formatCurrency(note.summary.total, note.currency)}
            </span>
            <div className="flex flex-wrap items-center gap-2">
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
                  {CREDIT_NOTE_STATUSES.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      disabled={option.value === note.status || changeStatus.isPending}
                      onClick={() => changeStatus.mutate(option.value)}
                    >
                      {option.value === note.status ? (
                        <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                      ) : (
                        <span className="mr-2 inline-block w-4" aria-hidden="true" />
                      )}
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {canEdit ? (
                <Button
                  variant="outline"
                  disabled={removeNote.isPending}
                  onClick={() => {
                    if (window.confirm(`Delete ${note.code}? This cannot be undone.`)) removeNote.mutate();
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
                  {note.items.map((line) => (
                    <TableRow key={line.lineNo}>
                      <TableCell className="text-foreground">{line.name}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{line.qty}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatCurrency(line.rate, note.currency)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-foreground">
                        {formatCurrency(line.amount, note.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell className="font-medium text-foreground">Subtotal</TableCell>
                    <TableCell />
                    <TableCell />
                    <TableCell className="text-right font-medium tabular-nums text-foreground">
                      {formatCurrency(note.summary.subtotal, note.currency)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium text-foreground">Tax</TableCell>
                    <TableCell />
                    <TableCell />
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatCurrency(note.summary.tax, note.currency)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium text-foreground">Total</TableCell>
                    <TableCell />
                    <TableCell />
                    <TableCell className="text-right font-semibold tabular-nums text-foreground">
                      {formatCurrency(note.summary.total, note.currency)}
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
              <DetailRow icon={CalendarDays} label="Date" value={new Date(note.date).toLocaleDateString()} />
              <DetailRow icon={Hash} label="Invoice" value={note.invoiceCode} />
              <DetailRow icon={Hash} label="Customer" value={note.customer.name} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <StickyNote className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Reason
              </CardTitle>
              <CardDescription>Why this credit was issued.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{note.reason ?? "—"}</p>
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
