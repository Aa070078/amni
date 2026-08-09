"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { LegacyColumnDef } from "@tanstack/react-table/legacy";
import { CheckCircle2, FileText, PackageCheck, Search, ShoppingCart, TrendingUp } from "lucide-react";
import { PURCHASE_ORDER_STATUSES, type PurchaseOrder, type PurchaseOrderStatus } from "@amni/shared";
import {
  Button,
  Card,
  CardContent,
  DataTable,
  DataTableColumnHeader,
  Skeleton,
} from "@amni/ui";
import { formatCurrency } from "@/src/lib/format";
import { formatPoDate, purchaseOrdersClient } from "@/src/lib/purchase-orders";
import { NewPurchaseOrderDialog } from "./new-purchase-order-dialog";
import { PurchaseOrderStatusBadge } from "./purchase-order-status";

const LIST_COLUMNS: LegacyColumnDef<PurchaseOrder>[] = [
  {
    accessorKey: "code",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Order" />,
    cell: ({ row }) => {
      const order = row.original;
      return (
        <Link
          href={`/purchasing/orders/${order.code}`}
          className="font-medium tabular-nums text-foreground hover:text-primary hover:underline"
        >
          {order.code}
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
    header: ({ column }) => <DataTableColumnHeader column={column} title="Order date" />,
    cell: ({ row }) => <span className="tabular-nums text-muted-foreground">{formatPoDate(row.original.date)}</span>,
  },
  {
    accessorKey: "expectedDate",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Expected" />,
    cell: ({ row }) => (
      <span className="tabular-nums text-muted-foreground">{formatPoDate(row.original.expectedDate)}</span>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => <PurchaseOrderStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "total",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Total" />,
    accessorFn: (order) => order.summary.total,
    cell: ({ row }) => (
      <span className="font-medium tabular-nums text-foreground">
        {formatCurrency(row.original.summary.total, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: "owner",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Owner" />,
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.owner ?? "—"}</span>,
  },
];

export function PurchaseOrdersView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<PurchaseOrder | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!createdOrder) return;
    const timer = setTimeout(() => setCreatedOrder(null), 5000);
    return () => clearTimeout(timer);
  }, [createdOrder]);

  const listQuery = useQuery({
    queryKey: ["purchase-orders", "list", debouncedSearch, statusFilter],
    queryFn: () =>
      purchaseOrdersClient.list({
        page: 1,
        pageSize: 100,
        sortBy: "createdAt",
        sortDir: "desc",
        q: debouncedSearch.trim() || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
      }),
    placeholderData: (previous) => previous,
  });

  const createOrder = (order: PurchaseOrder) => {
    setCreatedOrder(order);
    void queryClient.invalidateQueries({ queryKey: ["purchase-orders", "list"] });
  };

  const data = listQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Purchase orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Order from suppliers and track expected deliveries.
          </p>
        </div>
        <NewPurchaseOrderDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreate={createOrder} />
      </div>

      {createdOrder ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Created{" "}
            <Link
              href={`/purchasing/orders/${createdOrder.code}`}
              className="font-semibold underline underline-offset-2"
            >
              {createdOrder.code}
            </Link>{" "}
            from {createdOrder.supplier.name}.
          </span>
        </div>
      ) : null}

      {listQuery.isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <TrendingUp className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-base font-semibold">Couldn&apos;t load your purchase orders</p>
              <p className="text-sm text-muted-foreground">
                Something went wrong fetching your purchase orders. Please try again.
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
            <ShoppingCart className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-base font-semibold">
                {debouncedSearch || statusFilter !== "all" ? "No matching purchase orders" : "No purchase orders yet"}
              </p>
              <p className="text-sm text-muted-foreground">
                {debouncedSearch || statusFilter !== "all"
                  ? "Try adjusting your search or filters."
                  : "Create your first order to start purchasing."}
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
              <Button onClick={() => setDialogOpen(true)}>New purchase order</Button>
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
                placeholder="Search purchase orders…"
                aria-label="Search purchase orders"
                className="h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-sm"
              />
            </div>
            <select
              aria-label="Filter by status"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as PurchaseOrderStatus | "all")}
            >
              <option value="all">All statuses</option>
              {PURCHASE_ORDER_STATUSES.map((entry) => (
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
            globalSearchPlaceholder="Search purchase orders…"
            getRowId={(order) => (order as PurchaseOrder).code}
            initialSorting={[{ id: "date", desc: true }]}
            emptyState={{
              icon: <PackageCheck className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
              title: "No purchase orders yet",
              description: "Create your first order to start purchasing.",
            }}
            noResultsState={{
              icon: <FileText className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
              title: "No matching purchase orders",
              description: "Try adjusting your search or clear the filters.",
            }}
          />
        </>
      )}
    </div>
  );
}
