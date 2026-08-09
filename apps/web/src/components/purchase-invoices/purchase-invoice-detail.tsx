"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Banknote,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardX,
  Receipt,
  StickyNote,
  UserRound,
} from "lucide-react";
import {
  PURCHASE_INVOICE_STATUSES,
  type PurchaseInvoice,
  type PurchaseInvoiceStatus,
} from "@amni/shared";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@amni/ui";
import { AmniApiError } from "@/src/lib/client";
import { formatCurrency } from "@/src/lib/format";
import { formatPInvDate, purchaseInvoicesClient } from "@/src/lib/purchase-invoices";
import { PurchaseInvoiceStatusBadge } from "./purchase-invoice-status";
import { RecordPaymentDialog } from "./record-payment-dialog";

interface PurchaseInvoiceDetailViewProps {
  code: string;
}

export function PurchaseInvoiceDetailView({ code }: PurchaseInvoiceDetailViewProps) {
  const queryClient = useQueryClient();
  const [paymentOpen, setPaymentOpen] = useState(false);

  const detailQuery = useQuery({
    queryKey: ["purchase-invoices", "detail", code],
    queryFn: () => purchaseInvoicesClient.detail(code),
    retry: (failureCount, error) => {
      if (error instanceof AmniApiError && error.status === 404) return false;
      return failureCount < 2;
    },
  });

  const changeStatus = useMutation({
    mutationFn: (status: PurchaseInvoiceStatus) => purchaseInvoicesClient.changeStatus(code, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["purchase-invoices", "detail", code] });
      void queryClient.invalidateQueries({ queryKey: ["purchase-invoices", "list"] });
    },
  });

  const removeInvoice = useMutation({
    mutationFn: () => purchaseInvoicesClient.remove(code),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["purchase-invoices", "list"] });
      window.location.assign("/purchasing/invoices");
    },
  });

  const handleRecorded = (invoice: PurchaseInvoice) => {
    queryClient.setQueryData(["purchase-invoices", "detail", code], invoice);
    void queryClient.invalidateQueries({ queryKey: ["purchase-invoices", "list"] });
  };

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
    const is404 = detailQuery.error instanceof AmniApiError && detailQuery.error.status === 404;
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
          <Receipt className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-base font-semibold">
              {is404 ? "Purchase invoice not found" : "Couldn&apos;t load this purchase invoice"}
            </p>
            <p className="text-sm text-muted-foreground">
              {is404
                ? `No purchase invoice matches ${code}. It may have been removed.`
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
              <Link href="/purchasing/invoices">
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Back to purchase invoices
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const invoice = detailQuery.data;
  if (!invoice) return null;

  const remaining = invoice.summary.total - invoice.amountPaid;
  const canRecordPayment = invoice.status !== "paid" && invoice.status !== "cancelled";
  const isDraft = invoice.status === "draft";

  return (
    <div className="space-y-6">
      <Link
        href="/purchasing/invoices"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Purchase invoices
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{invoice.code}</h1>
              <PurchaseInvoiceStatusBadge status={invoice.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {invoice.supplier.name}
              {invoice.purchaseOrderCode ? ` · ${invoice.purchaseOrderCode}` : ""}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>Billed {formatPInvDate(invoice.date)}</span>
              <span>Due {formatPInvDate(invoice.dueDate)}</span>
              <span className="inline-flex items-center gap-1">
                <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                {invoice.owner ?? "—"}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:items-end">
            <div className="flex flex-col items-start gap-1 sm:items-end">
              <span className="text-2xl font-semibold tabular-nums tracking-tight">
                {formatCurrency(invoice.summary.total, invoice.currency)}
              </span>
              <span className="text-xs text-muted-foreground">
                Paid {formatCurrency(invoice.amountPaid, invoice.currency)} · Outstanding{" "}
                {formatCurrency(remaining, invoice.currency)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canRecordPayment ? (
                <Button onClick={() => setPaymentOpen(true)}>
                  <Banknote className="mr-2 h-4 w-4" aria-hidden="true" />
                  Record payment
                </Button>
              ) : null}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={changeStatus.isPending}>
                    <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />
                    Change status
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup
                    value={invoice.status}
                    onValueChange={(value) => changeStatus.mutate(value as PurchaseInvoiceStatus)}
                  >
                    {PURCHASE_INVOICE_STATUSES.map((entry) => (
                      <DropdownMenuRadioItem key={entry.value} value={entry.value}>
                        {entry.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              {isDraft ? (
                <Button
                  variant="outline"
                  disabled={removeInvoice.isPending}
                  onClick={() => {
                    if (window.confirm(`Delete ${invoice.code}? This cannot be undone.`)) removeInvoice.mutate();
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
                <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Items
              </CardTitle>
              <CardDescription>Line items on this invoice.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="w-20 text-right">Qty</TableHead>
                    <TableHead className="w-24 text-right">Rate</TableHead>
                    <TableHead className="w-28 text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item) => (
                    <TableRow key={`${item.lineNo}-${item.product}`}>
                      <TableCell>
                        <p className="font-medium text-foreground">{item.name}</p>
                        <p className="text-xs tabular-nums text-muted-foreground">{item.product}</p>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {item.qty} {item.uom}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatCurrency(item.rate, invoice.currency)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums text-foreground">
                        {formatCurrency(item.amount, invoice.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={3} className="text-right text-muted-foreground">
                      Subtotal
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-foreground">
                      {formatCurrency(invoice.summary.subtotal, invoice.currency)}
                    </TableCell>
                  </TableRow>
                  {invoice.summary.discount > 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-right text-muted-foreground">
                        Discount
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        −{formatCurrency(invoice.summary.discount, invoice.currency)}
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {invoice.summary.tax > 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-right text-muted-foreground">
                        Tax
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatCurrency(invoice.summary.tax, invoice.currency)}
                      </TableCell>
                    </TableRow>
                  ) : null}
                  <TableRow>
                    <TableCell colSpan={3} className="text-right text-muted-foreground">
                      Total
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-foreground">
                      {formatCurrency(invoice.summary.total, invoice.currency)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
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
                {invoice.notes || "No notes on this invoice."}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailRow icon={Building2} label="Supplier" value={invoice.supplier.name} />
            <DetailRow icon={UserRound} label="Supplier code" value={invoice.supplier.code} />
            {invoice.purchaseOrderCode ? (
              <DetailRow icon={Receipt} label="Purchase order" value={invoice.purchaseOrderCode} />
            ) : null}
            <DetailRow icon={CalendarDays} label="Invoice date" value={formatPInvDate(invoice.date)} />
            <DetailRow icon={CalendarDays} label="Due date" value={formatPInvDate(invoice.dueDate)} />
            <DetailRow icon={CheckCircle2} label="Currency" value={invoice.currency} />
            <DetailRow icon={UserRound} label="Owner" value={invoice.owner ?? "—"} />
            <div className="space-y-1.5">
              <DetailRow
                icon={Banknote}
                label="Amount paid"
                value={formatCurrency(invoice.amountPaid, invoice.currency)}
              />
              <DetailRow
                icon={Receipt}
                label="Outstanding"
                value={formatCurrency(remaining, invoice.currency)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <RecordPaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        invoice={invoice}
        onRecorded={handleRecorded}
      />
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
}) {
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
