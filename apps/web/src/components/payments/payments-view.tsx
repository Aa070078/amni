"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { LegacyColumnDef } from "@tanstack/react-table/legacy";
import { Banknote, CheckCircle2, CircleDollarSign, FileText, Search, TrendingUp, X } from "lucide-react";
import { PAYMENT_METHODS, type Payment } from "@amni/shared";
import {
  Badge,
  Button,
  Card,
  CardContent,
  DataTable,
  DataTableColumnHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  type BadgeProps,
} from "@amni/ui";
import { formatCurrency } from "@/src/lib/format";
import { formatPaymentDate, paymentsClient } from "@/src/lib/payments";
import { NewPaymentDialog } from "./new-payment-dialog";

const PAYMENT_TYPE_META: Record<Payment["type"], { variant: BadgeProps["variant"]; label: string }> = {
  incoming: { variant: "success", label: "Incoming" },
  outgoing: { variant: "secondary", label: "Outgoing" },
};

const PAYMENT_STATUS_META: Record<Payment["status"], { variant: BadgeProps["variant"]; label: string }> = {
  pending: { variant: "warning", label: "Pending" },
  cleared: { variant: "success", label: "Cleared" },
  failed: { variant: "destructive", label: "Failed" },
};

function methodLabel(value: Payment["method"]): string {
  return PAYMENT_METHODS.find((entry) => entry.value === value)?.label ?? value;
}

const LIST_COLUMNS: LegacyColumnDef<Payment>[] = [
  {
    accessorKey: "code",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Payment" />,
    cell: ({ row }) => {
      const payment = row.original;
      return (
        <Link
          href={`/finance/payments/${payment.code}`}
          className="font-medium tabular-nums text-foreground hover:text-primary hover:underline"
        >
          {payment.code}
        </Link>
      );
    },
  },
  {
    accessorKey: "date",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
    cell: ({ row }) => <span className="tabular-nums text-muted-foreground">{formatPaymentDate(row.original.date)}</span>,
  },
  {
    accessorKey: "type",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
    cell: ({ row }) => {
      const meta = PAYMENT_TYPE_META[row.original.type];
      return (
        <Badge variant={meta.variant} className="gap-1.5">
          <span
            className={row.original.type === "incoming" ? "h-1.5 w-1.5 rounded-full bg-success" : "h-1.5 w-1.5 rounded-full bg-foreground/50"}
            aria-hidden="true"
          />
          {meta.label}
        </Badge>
      );
    },
  },
  {
    accessorKey: "party",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Party" />,
    cell: ({ row }) => <span className="text-foreground">{row.original.party}</span>,
  },
  {
    accessorKey: "reference",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Reference" />,
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.reference ?? "—"}</span>,
  },
  {
    accessorKey: "invoiceCode",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Invoice" />,
    cell: ({ row }) => <span className="tabular-nums text-muted-foreground">{row.original.invoiceCode ?? "—"}</span>,
  },
  {
    accessorKey: "amount",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
    cell: ({ row }) => (
      <span className="font-medium tabular-nums text-foreground">
        {formatCurrency(row.original.amount, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: "method",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Method" />,
    cell: ({ row }) => <span className="text-muted-foreground">{methodLabel(row.original.method)}</span>,
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => {
      const meta = PAYMENT_STATUS_META[row.original.status];
      return (
        <Badge variant={meta.variant} className="gap-1.5">
          <span
            className={
              row.original.status === "cleared"
                ? "h-1.5 w-1.5 rounded-full bg-success"
                : row.original.status === "failed"
                  ? "h-1.5 w-1.5 rounded-full bg-destructive"
                  : "h-1.5 w-1.5 rounded-full bg-warning"
            }
            aria-hidden="true"
          />
          {meta.label}
        </Badge>
      );
    },
  },
  {
    accessorKey: "recordedBy",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Recorded by" />,
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.recordedBy ?? "—"}</span>,
  },
];

export function PaymentsView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [type, setType] = useState<Payment["type"] | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createdPayment, setCreatedPayment] = useState<Payment | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!createdPayment) return;
    const timer = setTimeout(() => setCreatedPayment(null), 5000);
    return () => clearTimeout(timer);
  }, [createdPayment]);

  const listQuery = useQuery({
    queryKey: ["payments", "list", debouncedSearch, type],
    queryFn: () =>
      paymentsClient.list({
        page: 1,
        pageSize: 100,
        sortBy: "date",
        sortDir: "desc",
        q: debouncedSearch.trim() || undefined,
        type: type === "all" ? undefined : type,
      }),
    placeholderData: (previous) => previous,
  });

  const createPayment = (payment: Payment) => {
    setCreatedPayment(payment);
    void queryClient.invalidateQueries({ queryKey: ["payments", "list"] });
  };

  const hasActiveFilters = Boolean(debouncedSearch) || type !== "all";

  const clearFilters = () => {
    setSearch("");
    setType("all");
  };

  const data = listQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Money in and money out, all in one place.
          </p>
        </div>
        <NewPaymentDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreate={createPayment} />
      </div>

      {createdPayment ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Created{" "}
            <Link
              href={`/finance/payments/${createdPayment.code}`}
              className="font-semibold underline underline-offset-2"
            >
              {createdPayment.code}
            </Link>{" "}
            · {createdPayment.party}
          </span>
        </div>
      ) : null}

      {listQuery.isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <TrendingUp className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-base font-semibold">Couldn&apos;t load your payments</p>
              <p className="text-sm text-muted-foreground">
                Something went wrong fetching your payments. Please try again.
              </p>
            </div>
            <Button variant="outline" onClick={() => void listQuery.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : listQuery.isLoading || !data ? (
        <div className="space-y-4">
          <div className="relative w-full overflow-auto rounded-md border">
            <div className="space-y-3 p-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-8 rounded-md" />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search
                className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search payments…"
                aria-label="Search payments"
                className="h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-sm"
              />
            </div>
            <Select value={type} onValueChange={(value) => setType(value as Payment["type"] | "all")}>
              <SelectTrigger className="w-40" aria-label="Filter by type">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="incoming">Incoming</SelectItem>
                <SelectItem value="outgoing">Outgoing</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters ? (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-1 h-4 w-4" aria-hidden="true" />
                Clear filters
              </Button>
            ) : null}
          </div>

          {data.items.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
                <Banknote className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="text-base font-semibold">
                    {hasActiveFilters ? "No matching payments" : "No payments yet"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {hasActiveFilters
                      ? "Try adjusting your search or filters."
                      : "Record your first payment to start tracking money movement."}
                  </p>
                </div>
                {hasActiveFilters ? (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : (
                  <Button onClick={() => setDialogOpen(true)}>New payment</Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <DataTable
              columns={LIST_COLUMNS}
              data={data.items}
              searchable
              globalSearchPlaceholder="Search payments…"
              getRowId={(payment) => (payment as Payment).code}
              initialSorting={[{ id: "date", desc: true }]}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={clearFilters}
              emptyState={{
                icon: <FileText className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
                title: "No payments yet",
                description: "Record your first payment to start tracking money movement.",
              }}
              noResultsState={{
                icon: <CircleDollarSign className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
                title: "No matching payments",
                description: "Try adjusting your search or filters.",
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
