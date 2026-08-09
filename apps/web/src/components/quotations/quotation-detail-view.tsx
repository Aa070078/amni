"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Coins,
  FileText,
  StickyNote,
  UserRound,
} from "lucide-react";
import { type QuotationStatus } from "@amni/shared";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  type ButtonProps,
} from "@amni/ui";
import { formatCurrency } from "@/src/lib/format";
import { formatQuotationDate, quotationsClient, QuotationsApiError } from "@/src/lib/quotations";
import { QuotationStatusBadge } from "./quotation-status";

interface QuotationDetailViewProps {
  code: string;
}

interface StatusAction {
  label: string;
  next: QuotationStatus;
  variant: NonNullable<ButtonProps["variant"]>;
}

const STATUS_ACTIONS: Record<QuotationStatus, StatusAction[]> = {
  draft: [
    { label: "Submit", next: "sent", variant: "default" },
    { label: "Cancel", next: "rejected", variant: "outline" },
  ],
  sent: [
    { label: "Accept", next: "accepted", variant: "default" },
    { label: "Cancel", next: "rejected", variant: "outline" },
  ],
  accepted: [{ label: "Convert to order", next: "converted", variant: "default" }],
  rejected: [],
  expired: [],
  converted: [],
};

export function QuotationDetailView({ code }: QuotationDetailViewProps) {
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ["quotations", "detail", code],
    queryFn: () => quotationsClient.detail(code),
    retry: (failureCount, error) => {
      if (error instanceof QuotationsApiError && error.status === 404) return false;
      return failureCount < 2;
    },
  });

  const changeStatus = useMutation({
    mutationFn: (status: QuotationStatus) => quotationsClient.changeStatus(code, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["quotations", "detail", code] });
      void queryClient.invalidateQueries({ queryKey: ["quotations", "list"] });
    },
  });

  if (detailQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-40 rounded-lg" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-48 rounded-lg lg:col-span-2" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </div>
    );
  }

  if (detailQuery.isError) {
    const is404 = detailQuery.error instanceof QuotationsApiError && detailQuery.error.status === 404;
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
          <FileText className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-base font-semibold">
              {is404 ? "Quotation not found" : "Couldn&apos;t load this quotation"}
            </p>
            <p className="text-sm text-muted-foreground">
              {is404
                ? `No quotation matches ${code}. It may have been removed.`
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
              <Link href="/sales/quotations">
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Back to quotations
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const quotation = detailQuery.data;
  if (!quotation) return null;

  return (
    <div className="space-y-6">
      <Link
        href="/sales/quotations"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Quotations
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{quotation.customer.name}</h1>
              <span className="text-sm tabular-nums text-muted-foreground">{quotation.code}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {quotation.customer.code} · Issued {formatQuotationDate(quotation.date)}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <QuotationStatusBadge status={quotation.status} />
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:items-end">
            <span className="text-2xl font-semibold tabular-nums tracking-tight">
              {formatCurrency(quotation.summary.total, quotation.currency)}
            </span>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {STATUS_ACTIONS[quotation.status].map((action) => (
                <Button
                  key={action.next}
                  variant={action.variant}
                  size="sm"
                  disabled={changeStatus.isPending}
                  onClick={() => changeStatus.mutate(action.next)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Details
              </CardTitle>
              <CardDescription>Quotation header information.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <DetailRow
                icon={Building2}
                label="Customer"
                value={`${quotation.customer.name} (${quotation.customer.code})`}
              />
              <DetailRow icon={CalendarDays} label="Date" value={formatQuotationDate(quotation.date)} />
              <DetailRow
                icon={CalendarDays}
                label="Valid until"
                value={formatQuotationDate(quotation.validUntil)}
              />
              <DetailRow icon={Coins} label="Currency" value={quotation.currency} />
              <DetailRow icon={UserRound} label="Owner" value={quotation.owner ?? "—"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Items</CardTitle>
              <CardDescription>Line items on this quotation.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotation.items.map((item) => (
                      <TableRow key={item.lineNo}>
                        <TableCell className="tabular-nums text-muted-foreground">{item.lineNo}</TableCell>
                        <TableCell>
                          <span className="font-medium text-foreground">{item.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {item.product} · {item.uom}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-foreground">{item.qty}</TableCell>
                        <TableCell className="text-right tabular-nums text-foreground">
                          {formatCurrency(item.rate, quotation.currency)}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums text-foreground">
                          {formatCurrency(item.amount, quotation.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <StickyNote className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {quotation.notes || "No notes for this quotation."}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Summary</CardTitle>
            <CardDescription>{quotation.items.length} line items</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <SummaryRow
              label="Subtotal"
              value={formatCurrency(quotation.summary.subtotal, quotation.currency)}
            />
            <SummaryRow
              label="Discount"
              value={`− ${formatCurrency(quotation.summary.discount, quotation.currency)}`}
            />
            <SummaryRow label="Tax" value={formatCurrency(quotation.summary.tax, quotation.currency)} />
            <Separator />
            <div className="flex items-center justify-between text-base font-semibold">
              <span className="text-foreground">Total</span>
              <span className="tabular-nums text-foreground">
                {formatCurrency(quotation.summary.total, quotation.currency)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums text-foreground">{value}</span>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
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
