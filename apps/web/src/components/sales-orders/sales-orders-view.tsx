"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { LegacyColumnDef } from "@tanstack/react-table/legacy";
import { CheckCircle2, ClipboardList, FileText, PackageCheck, Search, TrendingUp } from "lucide-react";
import type { SalesOrder } from "@amni/shared";
import {
  Button,
  Card,
  CardContent,
  DataTable,
  DataTableColumnHeader,
  Skeleton,
} from "@amni/ui";
import { formatCurrency } from "@/src/lib/format";
import { formatOrderDate, salesOrdersClient } from "@/src/lib/sales-orders";
import { NewSalesOrderDialog } from "./new-sales-order-dialog";
import { SalesOrderStatusBadge } from "./sales-order-status";

const LIST_COLUMNS: LegacyColumnDef<SalesOrder>[] = [
  {
    accessorKey: "code",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Order" />,
    cell: ({ row }) => {
      const order = row.original;
      return (
        <Link
          href={`/sales/orders/${order.code}`}
          className="font-medium tabular-nums text-foreground hover:text-primary hover:underline"
        >
          {order.code}
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
    header: ({ column }) => <DataTableColumnHeader column={column} title="Order date" />,
    cell: ({ row }) => <span className="tabular-nums text-muted-foreground">{formatOrderDate(row.original.date)}</span>,
  },
  {
    accessorKey: "deliveryDate",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Delivery" />,
    cell: ({ row }) => (
      <span className="tabular-nums text-muted-foreground">{formatOrderDate(row.original.deliveryDate)}</span>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => <SalesOrderStatusBadge status={row.original.status} />,
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

export function SalesOrdersView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<SalesOrder | null>(null);

  useEffect(() => {
    if (searchParams.get("new") !== "1") return;
    setDialogOpen(true);
    router.replace("/sales/orders", { scroll: false });
  }, [router, searchParams]);

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
    queryKey: ["sales-orders", "list", debouncedSearch],
    queryFn: () =>
      salesOrdersClient.list({
        page: 1,
        pageSize: 100,
        sortBy: "createdAt",
        sortDir: "desc",
        q: debouncedSearch.trim() || undefined,
      }),
    placeholderData: (previous) => previous,
  });

  const createOrder = (order: SalesOrder) => {
    setCreatedOrder(order);
    void queryClient.invalidateQueries({ queryKey: ["sales-orders", "list"] });
  };

  const data = listQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sales orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Raise orders, track delivery, and keep customers in the loop.
          </p>
        </div>
        <NewSalesOrderDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onCreate={createOrder}
        />
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
              href={`/sales/orders/${createdOrder.code}`}
              className="font-semibold underline underline-offset-2"
            >
              {createdOrder.code}
            </Link>{" "}
            for {createdOrder.customer.name}.
          </span>
        </div>
      ) : null}

      {listQuery.isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <TrendingUp className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-base font-semibold">Couldn&apos;t load your orders</p>
              <p className="text-sm text-muted-foreground">
                Something went wrong fetching your orders. Please try again.
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
            <ClipboardList className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-base font-semibold">
                {debouncedSearch ? "No matching orders" : "No orders yet"}
              </p>
              <p className="text-sm text-muted-foreground">
                {debouncedSearch
                  ? "Try adjusting your search."
                  : "Create your first order to start tracking sales."}
              </p>
            </div>
            {debouncedSearch ? (
              <Button variant="outline" onClick={() => setSearch("")}>
                Clear search
              </Button>
            ) : (
              <Button onClick={() => setDialogOpen(true)}>New order</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="relative">
            <Search
              className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search orders…"
              aria-label="Search orders"
              className="h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-sm"
            />
          </div>

          <DataTable
            columns={LIST_COLUMNS}
            data={data.items}
            searchable
            globalSearchPlaceholder="Search orders…"
            getRowId={(order) => (order as SalesOrder).code}
            initialSorting={[{ id: "date", desc: true }]}
            emptyState={{
              icon: <PackageCheck className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
              title: "No orders yet",
              description: "Create your first order to start tracking sales.",
            }}
            noResultsState={{
              icon: <FileText className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
              title: "No matching orders",
              description: "Try adjusting your search or clear the filters.",
            }}
          />
        </>
      )}
    </div>
  );
}
