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
  Phone,
  Receipt,
  Tag,
  Truck,
  UserRound,
} from "lucide-react";
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
import { suppliersClient } from "@/src/lib/suppliers";
import { SupplierStatusBadge } from "./supplier-status";

interface SupplierDetailViewProps {
  code: string;
}

export function SupplierDetailView({ code }: SupplierDetailViewProps) {
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ["suppliers", "detail", code],
    queryFn: () => suppliersClient.detail(code),
    retry: (failureCount, error) => {
      if (error instanceof AmniApiError && error.status === 404) return false;
      return failureCount < 2;
    },
  });

  const removeSupplier = useMutation({
    mutationFn: () => suppliersClient.remove(code),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["suppliers", "list"] });
      window.location.assign("/purchasing/suppliers");
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
          <Truck className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-base font-semibold">
              {is404 ? "Supplier not found" : "Couldn&apos;t load this supplier"}
            </p>
            <p className="text-sm text-muted-foreground">
              {is404
                ? `No supplier matches ${code}. It may have been removed.`
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
              <Link href="/purchasing/suppliers">
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Back to suppliers
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const supplier = detailQuery.data;
  if (!supplier) return null;

  return (
    <div className="space-y-6">
      <Link
        href="/purchasing/suppliers"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Suppliers
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{supplier.name}</h1>
              <SupplierStatusBadge status={supplier.status} />
            </div>
            <p className="mt-1 text-sm tabular-nums text-muted-foreground">{supplier.code}</p>
            {supplier.email ? (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                {supplier.email}
              </p>
            ) : null}
            {supplier.phone ? (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                {supplier.phone}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:items-end">
            <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-col sm:items-end">
              <div className="flex flex-col items-start gap-1 sm:items-end">
                <span className="text-2xl font-semibold tabular-nums tracking-tight">
                  {formatCurrency(supplier.outstanding, supplier.currency)}
                </span>
                <span className="text-xs text-muted-foreground">Outstanding</span>
              </div>
              <div className="flex flex-col items-start gap-1 sm:items-end">
                <span className="text-2xl font-semibold tabular-nums tracking-tight">
                  {formatCurrency(supplier.totalPurchases, supplier.currency)}
                </span>
                <span className="text-xs text-muted-foreground">Total purchases</span>
              </div>
            </div>
            <Button
              variant="outline"
              disabled={removeSupplier.isPending}
              onClick={() => {
                if (window.confirm(`Delete ${supplier.name}? This cannot be undone.`)) removeSupplier.mutate();
              }}
            >
              <ClipboardX className="mr-2 h-4 w-4" aria-hidden="true" />
              Delete supplier
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Profile
            </CardTitle>
            <CardDescription>Contact and billing details for this supplier.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <DetailRow icon={Tag} label="Group" value={supplier.group} />
            <DetailRow icon={CreditCard} label="Currency" value={supplier.currency} />
            <DetailRow icon={Receipt} label="Payment terms" value={supplier.paymentTerms ?? "—"} />
            <DetailRow icon={UserRound} label="Tax ID" value={supplier.taxId ?? "—"} />
            <DetailRow icon={Mail} label="Email" value={supplier.email ?? "—"} />
            <DetailRow icon={Phone} label="Phone" value={supplier.phone ?? "—"} />
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
              icon={Receipt}
              label="Outstanding"
              value={formatCurrency(supplier.outstanding, supplier.currency)}
            />
            <DetailRow
              icon={CreditCard}
              label="Total purchases"
              value={formatCurrency(supplier.totalPurchases, supplier.currency)}
            />
            <DetailRow icon={UserRound} label="Status" value={supplier.status} />
            <DetailRow icon={CalendarDays} label="Created" value={formatDate(supplier.createdAt)} />
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

function formatDate(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(parsed);
}
