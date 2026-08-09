"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Banknote,
  Building2,
  CalendarDays,
  CreditCard,
  FileText,
  Hash,
  UserRound,
} from "lucide-react";
import { PAYMENT_METHODS, type Payment } from "@amni/shared";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
  type BadgeProps,
} from "@amni/ui";
import { formatCurrency } from "@/src/lib/format";
import { AmniApiError } from "@/src/lib/client";
import { formatPaymentDate, paymentsClient } from "@/src/lib/payments";

const PAYMENT_TYPE_META: Record<Payment["type"], { variant: BadgeProps["variant"]; label: string }> = {
  incoming: { variant: "success", label: "Incoming" },
  outgoing: { variant: "secondary", label: "Outgoing" },
};

const PAYMENT_STATUS_META: Record<Payment["status"], { variant: BadgeProps["variant"]; label: string }> = {
  pending: { variant: "warning", label: "Pending" },
  cleared: { variant: "success", label: "Cleared" },
  failed: { variant: "destructive", label: "Failed" },
};

interface PaymentDetailViewProps {
  code: string;
}

export function PaymentDetailView({ code }: PaymentDetailViewProps) {
  const detailQuery = useQuery({
    queryKey: ["payments", "detail", code],
    queryFn: () => paymentsClient.detail(code),
    retry: (failureCount, error) => {
      if (error instanceof AmniApiError && error.status === 404) return false;
      return failureCount < 2;
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
    const is404 = detailQuery.error instanceof AmniApiError && detailQuery.error.status === 404;
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
          <Banknote className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-base font-semibold">
              {is404 ? "Payment not found" : "Couldn&apos;t load this payment"}
            </p>
            <p className="text-sm text-muted-foreground">
              {is404
                ? `No payment matches ${code}. It may have been removed.`
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
              <Link href="/finance/payments">
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Back to payments
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const payment = detailQuery.data;
  if (!payment) return null;

  const typeMeta = PAYMENT_TYPE_META[payment.type];
  const statusMeta = PAYMENT_STATUS_META[payment.status];
  const method = PAYMENT_METHODS.find((entry) => entry.value === payment.method);

  return (
    <div className="space-y-6">
      <Link
        href="/finance/payments"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Payments
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{payment.code}</h1>
              <Badge variant={typeMeta.variant} className="gap-1.5">
                <span
                  className={
                    payment.type === "incoming"
                      ? "h-1.5 w-1.5 rounded-full bg-success"
                      : "h-1.5 w-1.5 rounded-full bg-foreground/50"
                  }
                  aria-hidden="true"
                />
                {typeMeta.label}
              </Badge>
              <Badge variant={statusMeta.variant} className="gap-1.5">
                <span
                  className={
                    payment.status === "cleared"
                      ? "h-1.5 w-1.5 rounded-full bg-success"
                      : payment.status === "failed"
                        ? "h-1.5 w-1.5 rounded-full bg-destructive"
                        : "h-1.5 w-1.5 rounded-full bg-warning"
                  }
                  aria-hidden="true"
                />
                {statusMeta.label}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{payment.party}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>Paid {formatPaymentDate(payment.date)}</span>
              {payment.reference ? <span>{payment.reference}</span> : null}
              {payment.recordedBy ? (
                <span className="inline-flex items-center gap-1">
                  <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                  {payment.recordedBy}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
            <span className="text-2xl font-semibold tabular-nums tracking-tight">
              {formatCurrency(payment.amount, payment.currency)}
            </span>
            <span className="text-xs text-muted-foreground">{method?.label ?? payment.method}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Payment details
              </CardTitle>
              <CardDescription>How and why this payment was made.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailRow icon={CalendarDays} label="Date" value={formatPaymentDate(payment.date)} />
                <DetailRow icon={Building2} label="Party" value={payment.party} />
                <DetailRow icon={Hash} label="Reference" value={payment.reference ?? "—"} />
                <DetailRow icon={FileText} label="Invoice" value={payment.invoiceCode ?? "—"} />
                <DetailRow icon={CreditCard} label="Method" value={method?.label ?? payment.method} />
                <DetailRow icon={UserRound} label="Recorded by" value={payment.recordedBy ?? "—"} />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Banknote className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-medium tabular-nums text-foreground">
                {formatCurrency(payment.amount, payment.currency)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Currency</span>
              <span className="tabular-nums text-foreground">{payment.currency}</span>
            </div>
            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-sm font-medium text-foreground">Total</span>
              <span className="font-semibold tabular-nums text-foreground">
                {formatCurrency(payment.amount, payment.currency)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
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
