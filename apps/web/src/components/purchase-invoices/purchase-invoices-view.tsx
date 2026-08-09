"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { LegacyColumnDef } from "@tanstack/react-table/legacy";
import { CheckCircle2, FileText, Receipt, Search, TrendingUp } from "lucide-react";
import { PURCHASE_INVOICE_STATUSES, type PurchaseInvoice, type PurchaseInvoiceStatus } from "@amni/shared";
import {
  Button,
  Card,
  CardContent,
  DataTable,
  DataTableColumnHeader,
  Skeleton,
} from "@amni/ui";
import { formatCurrency } from "@/src/lib/format";
import { formatPInvDate, purchaseInvoicesClient } from "@/src/lib/purchase-invoices";
import { NewPurchaseInvoiceDialog } from "./new-purchase-invoice-dialog";
import { PurchaseInvoiceStatusBadge } from "./purchase-invoice-status";

const LIST_COLUMNS: LegacyColumnDef<PurchaseInvoice>[] = [
  {
    accessorKey: "code",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Invoice" />,
    cell: ({ row }) => {
      const invoice = row.original;
      return (
        <Link
          href={`/purchasing/invoices/${invoice.code}`}
          className="font-medium tabular-nums text-foreground hover:text-primary hover:underline"
        >
          {invoice.code}
        </Link>
      );
    },
  },
  {
    accessorKey: "supplier",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Supplier" />,
    cell: ({ row }) => <span className="text-foreground">{row.original.supplier.name}</span>,
  },
  {
    accessorKey: "date",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
    cell: ({ row }) => <span className="tabular-nums text-muted-foreground">{formatPInvDate(row.original.date)}</span>,
  },
  {
    accessorKey: "dueDate",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Due date" />,
    cell: ({ row }) => (
      <span className="tabular-nums text-muted-foreground">{formatPInvDate(row.original.dueDate)}</span>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => <PurchaseInvoiceStatusBadge status={row.original.status} />,
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
    accessorKey: "total",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Total" />,
    accessorFn: (invoice) => invoice.summary.total,
    cell: ({ row }) => (
      <span className="font-medium tabular-nums text-foreground">
        {formatCurrency(row.original.summary.total, row.original.currency)}
      </span>
    ),
  },
];

export function PurchaseInvoicesView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PurchaseInvoiceStatus | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<PurchaseInvoice | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!createdInvoice) return;
    const timer = setTimeout(() => setCreatedInvoice(null), 5000);
    return () => clearTimeout(timer);
  }, [createdInvoice]);

  const listQuery = useQuery({
    queryKey: ["purchase-invoices", "list", debouncedSearch, statusFilter],
    queryFn: () =>
      purchaseInvoicesClient.list({
        page: 1,
        pageSize: 100,
        sortBy: "createdAt",
        sortDir: "desc",
        q: debouncedSearch.trim() || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
      }),
    placeholderData: (previous) => previous,
  });

  const createInvoice = (invoice: PurchaseInvoice) => {
    setCreatedInvoice(invoice);
    void queryClient.invalidateQueries({ queryKey: ["purchase-invoices", "list"] });
  };

  const data = listQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Purchase invoices</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track bills from suppliers and record payments against them.
          </p>
        </div>
        <NewPurchaseInvoiceDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreate={createInvoice} />
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
              href={`/purchasing/invoices/${createdInvoice.code}`}
              className="font-semibold underline underline-offset-2"
            >
              {createdInvoice.code}
            </Link>{" "}
            from {createdInvoice.supplier.name}.
          </span>
        </div>
      ) : null}

      {listQuery.isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <TrendingUp className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-base font-semibold">Couldn&apos;t load your purchase invoices</p>
              <p className="text-sm text-muted-foreground">
                Something went wrong fetching your purchase invoices. Please try again.
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
      ) : data.items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <Receipt className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-base font-semibold">
                {debouncedSearch || statusFilter !== "all" ? "No matching purchase invoices" : "No purchase invoices yet"}
              </p>
              <p className="text-sm text-muted-foreground">
                {debouncedSearch || statusFilter !== "all"
                  ? "Try adjusting your search or filters."
                  : "Record your first supplier bill to track what you owe."}
              </p>
            </div>
            {debouncedSearch || statusFilter !== "all" ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
              >
                Clear filters
              </Button>
            ) : (
              <Button onClick={() => setDialogOpen(true)}>New purchase invoice</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search purchase invoices…"
                aria-label="Search purchase invoices"
                className="h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-sm"
              />
            </div>
            <select
              aria-label="Filter by status"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as PurchaseInvoiceStatus | "all")}
            >
              <option value="all">All statuses</option>
              {PURCHASE_INVOICE_STATUSES.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>
          </div>

          <DataTable
            columns={LIST_COLUMNS}
            data={data.items}
            searchable
            globalSearchPlaceholder="Search purchase invoices…"
            getRowId={(invoice) => (invoice as PurchaseInvoice).code}
            initialSorting={[{ id: "date", desc: true }]}
            emptyState={{
              icon: <FileText className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
              title: "No purchase invoices yet",
              description: "Record your first supplier bill to track what you owe.",
            }}
            noResultsState={{
              icon: <Receipt className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
              title: "No matching purchase invoices",
              description: "Try adjusting your search or clear the filters.",
            }}
          />
        </>
      )}
    </div>
  );
}
