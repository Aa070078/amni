"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, Building2, CalendarDays, CheckCircle2, ReceiptText, StickyNote } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Progress,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@amni/ui";
import type { PurchaseInvoiceStatus } from "@amni/shared";
import { getPurchaseInvoice } from "@/src/lib/purchasing";
import { purchaseInvoiceStatusBadge, purchaseInvoiceStatusLabel } from "@/src/lib/purchasing";
import { formatCurrency, formatDate, formatNumber } from "@/src/lib/format";
import { PanelError } from "@/src/components/dashboard/panel-utils";

function StatusBadge({ status }: { status: PurchaseInvoiceStatus }) {
  return <Badge variant={purchaseInvoiceStatusBadge[status]}>{purchaseInvoiceStatusLabel(status)}</Badge>;
}

function DetailSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-40 rounded-lg lg:col-span-2" />
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-64 rounded-lg lg:col-span-3" />
      </div>
    </div>
  );
}

export function PurchaseInvoiceDetailView({ id }: { id: string }) {
  const query = useQuery({
    queryKey: ["purchasing", "purchase-invoice", id],
    queryFn: () => getPurchaseInvoice(id),
  });

  if (query.isLoading) {
    return <DetailSkeleton />;
  }

  if (query.isError || !query.data) {
    return <PanelError onRetry={() => void query.refetch()} />;
  }

  const invoice = query.data;
  const paidPercent = invoice.total > 0 ? Math.round((invoice.paid / invoice.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/purchasing/purchase-invoices">
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Purchase invoices
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <ReceiptText className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              {invoice.number}
            </CardTitle>
            <StatusBadge status={invoice.status} />
            <Badge variant="secondary">{invoice.currency}</Badge>
          </div>
          <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
              <Link href={`/purchasing/suppliers/${invoice.supplierId}`} className="hover:underline">
                {invoice.supplierName}
              </Link>
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              Dated {formatDate(invoice.date)}
            </span>
            {invoice.dueDate ? (
              <span className="flex items-center gap-1.5">Due {formatDate(invoice.dueDate)}</span>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-md border p-4">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="mt-1 text-2xl font-semibold">
                {formatCurrency(invoice.total, invoice.currency)}
              </p>
            </div>
            <div className="rounded-md border p-4">
              <p className="text-sm text-muted-foreground">Paid</p>
              <p className="mt-1 flex items-center gap-1.5 text-2xl font-semibold">
                <CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />
                {formatCurrency(invoice.paid, invoice.currency)}
              </p>
            </div>
            <div className="rounded-md border p-4">
              <p className="text-sm text-muted-foreground">Outstanding</p>
              <p className="mt-1 text-2xl font-semibold">
                {formatCurrency(invoice.outstanding, invoice.currency)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3" aria-label={`${paidPercent}% of this invoice is paid`}>
            <Progress value={paidPercent} className="h-2 flex-1" />
            <span className="text-sm text-muted-foreground">{paidPercent}%</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Line items</CardTitle>
            <CardDescription>Items billed on this invoice.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.items.map((item, index) => (
                  <TableRow key={`${item.item}-${index}`}>
                    <TableCell className="font-medium">{item.item}</TableCell>
                    <TableCell className="text-right">{formatNumber(item.quantity)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.rate, invoice.currency)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.amount, invoice.currency)}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-medium">
                    Total
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(invoice.total, invoice.currency)}
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
              Invoice details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {invoice.submittedAt ? (
              <div>
                <p className="font-medium text-muted-foreground">Submitted</p>
                <p className="mt-1">{formatDate(invoice.submittedAt)}</p>
              </div>
            ) : null}
            {invoice.paidAt ? (
              <div>
                <p className="font-medium text-muted-foreground">Paid</p>
                <p className="mt-1">{formatDate(invoice.paidAt)}</p>
              </div>
            ) : null}
            {invoice.notes ? (
              <div>
                <p className="font-medium text-muted-foreground">Notes</p>
                <p className="mt-1">{invoice.notes}</p>
              </div>
            ) : null}
            <div>
              <p className="font-medium text-muted-foreground">Created</p>
              <p className="mt-1">{formatDate(invoice.createdAt)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
