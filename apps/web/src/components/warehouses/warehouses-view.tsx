"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Search, TrendingUp, Warehouse as WarehouseIcon } from "lucide-react";
import type { Warehouse } from "@amni/shared";
import { Button, Card, CardContent, DataTable, DataTableColumnHeader, Skeleton } from "@amni/ui";
import { formatCurrency } from "@/src/lib/format";
import { warehousesClient, warehouseStockValue } from "@/src/lib/warehouses";
import { NewWarehouseDialog } from "./new-warehouse-dialog";
import { WarehouseStatusBadge } from "./warehouse-status";

type WarehouseRow = Warehouse & { stockLinesCount: number; lowStockCount: number };

interface StockSummary {
  byCode: Map<string, { stockCount: number; lowStockCount: number }>;
  stockValue: number;
  lowStockLines: number;
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
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

export function WarehousesView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createdWarehouse, setCreatedWarehouse] = useState<Warehouse | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!createdWarehouse) return;
    const timer = setTimeout(() => setCreatedWarehouse(null), 5000);
    return () => clearTimeout(timer);
  }, [createdWarehouse]);

  const listQuery = useQuery({
    queryKey: ["warehouses", "list", debouncedSearch],
    queryFn: () => warehousesClient.list({ page: 1, pageSize: 100, q: debouncedSearch.trim() || undefined }),
    placeholderData: (previous) => previous,
  });

  const stockSummaryQuery = useQuery<StockSummary>({
    queryKey: ["warehouses", "stock-summary"],
    queryFn: async () => {
      const all = await warehousesClient.list({ page: 1, pageSize: 100 });
      const details = await Promise.all(all.items.map((warehouse) => warehousesClient.detail(warehouse.code)));
      const byCode = new Map(
        details.map((detail) =>
          [detail.code, { stockCount: detail.stock.length, lowStockCount: detail.lowStock.length }] as const,
        ),
      );
      const stockValue = details.reduce((sum, detail) => sum + warehouseStockValue(detail.stock), 0);
      const lowStockLines = details.reduce((sum, detail) => sum + detail.lowStock.length, 0);
      return { byCode, stockValue, lowStockLines };
    },
    enabled: Boolean(listQuery.data),
    placeholderData: (previous) => previous,
  });

  const createWarehouse = useMutation({
    mutationFn: warehousesClient.create,
    onSuccess: (warehouse) => {
      setCreatedWarehouse(warehouse);
      void queryClient.invalidateQueries({ queryKey: ["warehouses", "list"] });
      void queryClient.invalidateQueries({ queryKey: ["warehouses", "stock-summary"] });
    },
  });

  const rows: WarehouseRow[] = (listQuery.data?.items ?? []).map((warehouse) => ({
    ...warehouse,
    stockLinesCount: stockSummaryQuery.data?.byCode.get(warehouse.code)?.stockCount ?? 0,
    lowStockCount: stockSummaryQuery.data?.byCode.get(warehouse.code)?.lowStockCount ?? 0,
  }));

  const warehouseCount = listQuery.data?.items.length ?? 0;
  const activeCount = (listQuery.data?.items ?? []).filter((warehouse) => warehouse.status === "active").length;
  const stockValue = stockSummaryQuery.data?.stockValue ?? 0;
  const lowStockLines = stockSummaryQuery.data?.lowStockLines ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Warehouses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage locations and keep an eye on stock levels across the business.
          </p>
        </div>
        <NewWarehouseDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onCreate={(warehouse) => createWarehouse.mutate(warehouse)}
        />
      </div>

      {createdWarehouse ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Created{" "}
            <Link
              href={`/inventory/warehouses/${createdWarehouse.code}`}
              className="font-semibold underline underline-offset-2"
            >
              {createdWarehouse.code}
            </Link>{" "}
            for {createdWarehouse.name}.
          </span>
        </div>
      ) : null}

      {listQuery.isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <TrendingUp className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-base font-semibold">Couldn&apos;t load your warehouses</p>
              <p className="text-sm text-muted-foreground">
                Something went wrong fetching your inventory. Please try again.
              </p>
            </div>
            <Button variant="outline" onClick={() => void listQuery.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : listQuery.isLoading || !listQuery.data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-20 rounded-lg" />
            ))}
          </div>
          <div className="space-y-2" aria-hidden>
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-11 rounded-md" />
            ))}
          </div>
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <WarehouseIcon className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-base font-semibold">No warehouses yet</p>
              <p className="text-sm text-muted-foreground">
                Create your first warehouse to start tracking stock levels.
              </p>
            </div>
            <Button onClick={() => setDialogOpen(true)}>New warehouse</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Warehouses" value={`${warehouseCount}`} hint="Across all statuses" />
            <StatCard
              label="Stock value"
              value={formatCurrency(stockValue, "USD")}
              hint="On-hand × list price"
            />
            <StatCard
              label="Low stock"
              value={`${lowStockLines}`}
              hint="Lines below reorder level"
            />
            <StatCard label="Active" value={`${activeCount}`} hint="Active warehouses" />
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
              placeholder="Search warehouses…"
              aria-label="Search warehouses"
              className="h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-sm"
            />
          </div>

          <DataTable
            columns={[
              {
                accessorKey: "name",
                header: ({ column }) => <DataTableColumnHeader column={column} title="Warehouse" />,
                cell: ({ row }) => {
                  const warehouse = row.original as WarehouseRow;
                  return (
                    <div className="flex flex-col">
                      <Link
                        href={`/inventory/warehouses/${warehouse.code}`}
                        className="font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {warehouse.name}
                      </Link>
                      <span className="text-xs tabular-nums text-muted-foreground">{warehouse.code}</span>
                    </div>
                  );
                },
              },
              {
                accessorKey: "location",
                header: ({ column }) => <DataTableColumnHeader column={column} title="Location" />,
                cell: ({ row }) => {
                  const warehouse = row.original as WarehouseRow;
                  return <span className="text-muted-foreground">{warehouse.location ?? "—"}</span>;
                },
              },
              {
                accessorKey: "manager",
                header: ({ column }) => <DataTableColumnHeader column={column} title="Manager" />,
                cell: ({ row }) => {
                  const warehouse = row.original as WarehouseRow;
                  return <span className="text-muted-foreground">{warehouse.manager ?? "—"}</span>;
                },
              },
              {
                accessorKey: "status",
                header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
                cell: ({ row }) => <WarehouseStatusBadge status={(row.original as WarehouseRow).status} />,
              },
              {
                accessorKey: "stockLinesCount",
                header: ({ column }) => <DataTableColumnHeader column={column} title="Stock lines" />,
                cell: ({ row }) => {
                  const warehouse = row.original as WarehouseRow;
                  return (
                    <span className="tabular-nums text-muted-foreground">{warehouse.stockLinesCount}</span>
                  );
                },
              },
              {
                accessorKey: "lowStockCount",
                header: ({ column }) => <DataTableColumnHeader column={column} title="Low stock" />,
                cell: ({ row }) => {
                  const warehouse = row.original as WarehouseRow;
                  return warehouse.lowStockCount > 0 ? (
                    <span className="font-medium tabular-nums text-warning">{warehouse.lowStockCount}</span>
                  ) : (
                    <span className="tabular-nums text-muted-foreground">0</span>
                  );
                },
              },
            ]}
            data={rows}
            loading={listQuery.isLoading}
            getRowId={(warehouse) => (warehouse as WarehouseRow).code}
            initialSorting={[{ id: "name", desc: false }]}
            emptyState={{
              title: "No warehouses yet",
              description: "Create your first warehouse to start tracking stock levels.",
            }}
            noResultsState={{
              title: "No matching warehouses",
              description: "Try adjusting your search or clear the filters.",
            }}
          />
        </>
      )}
    </div>
  );
}
