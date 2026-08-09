"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardX,
  CreditCard,
  Mail,
  MapPin,
  Phone,
  Receipt,
  Tag,
  TrendingUp,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import type { Customer } from "@amni/shared";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from "@amni/ui";
import { AmniApiError } from "@/src/lib/client";
import { formatCurrency } from "@/src/lib/format";
import { customersClient, formatCustomerDate } from "@/src/lib/customers";
import { CustomerStatusBadge } from "./customer-status";

const CUSTOMER_TYPE_LABELS: Record<Customer["type"], string> = {
  company: "Company",
  individual: "Individual",
};

interface CustomerDetailViewProps {
  code: string;
}

export function CustomerDetailView({ code }: CustomerDetailViewProps) {
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ["customers", "detail", code],
    queryFn: () => customersClient.detail(code),
    retry: (failureCount, error) => {
      if (error instanceof AmniApiError && error.status === 404) return false;
      return failureCount < 2;
    },
  });

  const removeCustomer = useMutation({
    mutationFn: () => customersClient.remove(code),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["customers", "list"] });
      window.location.assign("/sales/customers");
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
          <Users className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-base font-semibold">
              {is404 ? "Customer not found" : "Couldn&apos;t load this customer"}
            </p>
            <p className="text-sm text-muted-foreground">
              {is404
                ? `No customer matches ${code}. It may have been removed.`
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
              <Link href="/sales/customers">
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Back to customers
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const customer = detailQuery.data;
  if (!customer) return null;

  return (
    <div className="space-y-6">
      <Link
        href="/sales/customers"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Customers
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{customer.name}</h1>
              <CustomerStatusBadge status={customer.status} />
            </div>
            <p className="mt-1 text-sm tabular-nums text-muted-foreground">{customer.code}</p>
            {customer.email ? (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                {customer.email}
              </p>
            ) : null}
            {customer.phone ? (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                {customer.phone}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:items-end">
            <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-col sm:items-end">
              <div className="flex flex-col items-start gap-1 sm:items-end">
                <span className="text-2xl font-semibold tabular-nums tracking-tight">
                  {formatCurrency(customer.outstanding, customer.currency)}
                </span>
                <span className="text-xs text-muted-foreground">Outstanding</span>
              </div>
              <div className="flex flex-col items-start gap-1 sm:items-end">
                <span className="text-2xl font-semibold tabular-nums tracking-tight">
                  {formatCurrency(customer.totalSales, customer.currency)}
                </span>
                <span className="text-xs text-muted-foreground">Total sales</span>
              </div>
            </div>
            <Button
              variant="outline"
              disabled={removeCustomer.isPending}
              onClick={() => {
                if (window.confirm(`Delete ${customer.name}? This cannot be undone.`)) removeCustomer.mutate();
              }}
            >
              <ClipboardX className="mr-2 h-4 w-4" aria-hidden="true" />
              Delete customer
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRound className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Profile
            </CardTitle>
            <CardDescription>Contact and billing details for this customer.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <DetailRow icon={Building2} label="Type" value={CUSTOMER_TYPE_LABELS[customer.type]} />
            <DetailRow icon={Tag} label="Group" value={customer.group} />
            <DetailRow icon={MapPin} label="Territory" value={customer.territory ?? "—"} />
            <DetailRow icon={CreditCard} label="Currency" value={customer.currency} />
            <DetailRow icon={Receipt} label="Payment terms" value={customer.paymentTerms ?? "—"} />
            <DetailRow icon={Mail} label="Email" value={customer.email ?? "—"} />
            <DetailRow icon={Phone} label="Phone" value={customer.phone ?? "—"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailRow
              icon={Wallet}
              label="Outstanding"
              value={formatCurrency(customer.outstanding, customer.currency)}
            />
            <DetailRow
              icon={TrendingUp}
              label="Total sales"
              value={formatCurrency(customer.totalSales, customer.currency)}
            />
            <DetailRow icon={UserRound} label="Status" value={customer.status} />
            <DetailRow icon={CalendarDays} label="Created" value={formatCustomerDate(customer.createdAt)} />
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
  icon: typeof UserRound;
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
