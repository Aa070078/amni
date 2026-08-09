"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { LegacyColumnDef } from "@tanstack/react-table/legacy";
import { CheckCircle2, CircleDollarSign, FileText, Receipt, Search, TrendingUp } from "lucide-react";
import type { SalesInvoice } from "@amni/shared";
import {
  Button,
  Card,
  CardContent,
  DataTable,
  DataTableColumnHeader,
  Skeleton,
} from "@amni/ui";
import { formatCurrency } from "@/src/lib/format";
import { salesInvoicesClient } from "@/src/lib/sales-invoices";
import { NewSalesInvoiceDialog } from "./new-sales-invoice-dialog";
import { SalesInvoiceStatusBadge } from "./sales-invoice-status";

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-xl font-semibold tabular-nums tracking-tight">{value}</span>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </CardContent>
    </Card>
  );
}

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(date));

const LIST_COLUMNS: LegacyColumnDef<SalesInvoice>[] = [
  {
    accessorKey: "code",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Invoice" />,
    cell: ({ row }) => {
      const invoice = row.original;
      return (
        <Link
          href={`/sales/invoices/${invoice.code}`}
          className="font-medium tabular-nums text-foreground hover:text-primary hover:underline"
        >
          {invoice.code}
        </Link>
      );
    },
  },
  {
    accessorKey: "customer",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Customer" />,
    cell: ({ row }) => <span className="text-foreground">{row.original.customer.name}</span>,
  },
  {
    accessorKey: "date",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
    cell: ({ row }) => <span className="tabular-nums text-muted-foreground">{formatDate(row.original.date)}</span>,
  },
  {
    accessorKey: "dueDate",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Due date" />,
    cell: ({ row }) => (
      <span className="tabular-nums text-muted-foreground">{formatDate(row.original.dueDate)}</span>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => <SalesInvoiceStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "total",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Total" />,
    accessorFn: (invoice) => invoice.summary.total,
    cell: ({ row }) => (
      <span className="font-medium tabular-nums text-foreground">
        {formatCurrency(row.original.summary.total, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: "amountPaid",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Paid" />,
    cell: ({ row }) => (
      <span className="tabular-nums text-muted-foreground">
        {formatCurrency(row.original.amountPaid, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: "owner",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Owner" />,
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.owner ?? "—"}</span>,
  },
];

export function SalesInvoicesView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<SalesInvoice | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!createdInvoice) return;
    const timer = setTimeout(() => setCreatedInvoice(null), 5000);
    return () => clearTimeout(timer);
  }, [createdInvoice]);

  const summaryQuery = useQuery({
    queryKey: ["sales-invoices", "summary"],
    queryFn: () => salesInvoicesClient.summary(),
    placeholderData: (previous) => previous,
  });

  const listQuery = useQuery({
    queryKey: ["sales-invoices", "list", debouncedSearch],
    queryFn: () =>
      salesInvoicesClient.list({
        page: 1,
        pageSize: 100,
        sortBy: "createdAt",
        sortDir: "desc",
        q: debouncedSearch.trim() || undefined,
      }),
    placeholderData: (previous) => previous,
  });

  const createInvoice = (invoice: SalesInvoice) => {
    setCreatedInvoice(invoice);
    void queryClient.invalidateQueries({ queryKey: ["sales-invoices", "list"] });
    void queryClient.invalidateQueries({ queryKey: ["sales-invoices", "summary"] });
  };

  const data = listQuery.data;
  const summary = summaryQuery.data;
  const currency = summary?.currency ?? "USD";

  const isError = listQuery.isError || summaryQuery.isError;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sales invoices</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Bill your customers, track what&apos;s outstanding, and record payments.
          </p>
        </div>
        <NewSalesInvoiceDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onCreate={(invoice) => createInvoice(invoice)}
        />
      </div>

      {createdInvoice ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Created{" "}
            <Link
              href={`/sales/invoices/${createdInvoice.code}`}
              className="font-semibold underline underline-offset-2"
            >
              {createdInvoice.code}
            </Link>{" "}
            for {createdInvoice.customer.name}.
          </span>
        </div>
      ) : null}

      {isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <TrendingUp className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-base font-semibold">Couldn&apos;t load your invoices</p>
              <p className="text-sm text-muted-foreground">
                Something went wrong fetching your invoices. Please try again.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                void listQuery.refetch();
                void summaryQuery.refetch();
              }}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : listQuery.isLoading || !data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-20 rounded-lg" />
            ))}
          </div>
          <div className="relative w-full overflow-auto rounded-md border">
            <div className="space-y-3 p-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-8 rounded-md" />
              ))}
            </div>
          </div>
        </div>
      ) : data.items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <Receipt className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-base font-semibold">
                {debouncedSearch ? "No matching invoices" : "No invoices yet"}
              </p>
              <p className="text-sm text-muted-foreground">
                {debouncedSearch
                  ? "Try adjusting your search."
                  : "Create your first invoice to start billing customers."}
              </p>
            </div>
            {debouncedSearch ? (
              <Button variant="outline" onClick={() => setSearch("")}>
                Clear search
              </Button>
            ) : (
              <Button onClick={() => setDialogOpen(true)}>New invoice</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {summary ? (
              <>
                <StatCard
                  label="Outstanding receivables"
                  value={formatCurrency(summary.outstanding, currency)}
                  hint="Open invoices yet to be paid"
                />
                <StatCard
                  label="This month billed"
                  value={formatCurrency(summary.monthBilled, currency)}
                  hint="Invoiced this calendar month"
                />
                <StatCard
                  label="Overdue amount"
                  value={formatCurrency(summary.overdue, currency)}
                  hint="Past their due date"
                />
                <StatCard
                  label="Invoices"
                  value={String(summary.count)}
                  hint="Issued, excluding cancelled"
                />
              </>
            ) : (
              Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-20 rounded-lg" />
              ))
            )}
          </div>

          <div className="relative">
            <Search
              className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search invoices…"
              aria-label="Search invoices"
              className="h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-sm"
            />
          </div>

          <DataTable
            columns={LIST_COLUMNS}
            data={data.items}
            searchable
            globalSearchPlaceholder="Search invoices…"
            getRowId={(invoice) => (invoice as SalesInvoice).code}
            initialSorting={[{ id: "date", desc: true }]}
            emptyState={{
              icon: <FileText className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
              title: "No invoices yet",
              description: "Create your first invoice to start billing customers.",
            }}
            noResultsState={{
              icon: <CircleDollarSign className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
              title: "No matching invoices",
              description: "Try adjusting your search or clear the filters.",
            }}
          />
        </>
      )}
    </div>
  );
}
