"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, LayoutGrid, List, Package, Search, X } from "lucide-react";
import { MOVEMENT_TYPES, type MovementType, type StockMovement } from "@amni/shared";
import {
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
} from "@amni/ui";
import { formatNumber } from "@/src/lib/format";
import { formatMovementDate, stockMovementsClient } from "@/src/lib/stock-movements";
import { MovementTypeBadge } from "./movement-type";
import { NewStockMovementDialog } from "./new-stock-movement-dialog";
import { StockMovementsBoard } from "./stock-movements-board";

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

export function StockMovementsView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [view, setView] = useState<"table" | "board">("table");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createdMovement, setCreatedMovement] = useState<StockMovement | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!createdMovement) return;
    const timer = setTimeout(() => setCreatedMovement(null), 5000);
    return () => clearTimeout(timer);
  }, [createdMovement]);

  const listQuery = useQuery({
    queryKey: ["stock-movements", "list", debouncedSearch, typeFilter],
    queryFn: () =>
      stockMovementsClient.list({
        page: 1,
        pageSize: 100,
        q: debouncedSearch.trim() || undefined,
        type: typeFilter === "all" ? undefined : (typeFilter as MovementType),
      }),
    placeholderData: (previous) => previous,
  });

  const createMovement = useMutation({
    mutationFn: stockMovementsClient.create,
    onSuccess: (movement) => {
      setCreatedMovement(movement);
      void queryClient.invalidateQueries({ queryKey: ["stock-movements", "list"] });
    },
  });

  const data = listQuery.data;
  const hasActiveFilters = Boolean(debouncedSearch.trim() || typeFilter !== "all");

  const inQty = data ? data.items.filter((movement) => movement.type === "in").reduce((sum, movement) => sum + movement.quantity, 0) : 0;
  const outQty = data ? data.items.filter((movement) => movement.type === "out").reduce((sum, movement) => sum + movement.quantity, 0) : 0;
  const adjustCount = data ? data.items.filter((movement) => movement.type === "adjust").length : 0;

  function clearFilters() {
    setSearch("");
    setDebouncedSearch("");
    setTypeFilter("all");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Stock movements</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track inbound, outbound, transfer, and adjustment movements across your warehouses.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            role="group"
            aria-label="View mode"
            className="inline-flex items-center rounded-md border bg-muted/50 p-0.5"
          >
            <Button
              variant={view === "table" ? "default" : "ghost"}
              size="sm"
              className="h-7 gap-1.5 px-2.5 text-xs font-medium"
              onClick={() => setView("table")}
              aria-pressed={view === "table"}
            >
              <List className="h-3.5 w-3.5" aria-hidden="true" />
              List
            </Button>
            <Button
              variant={view === "board" ? "default" : "ghost"}
              size="sm"
              className="h-7 gap-1.5 px-2.5 text-xs font-medium"
              onClick={() => setView("board")}
              aria-pressed={view === "board"}
            >
              <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
              Board
            </Button>
          </div>
          <NewStockMovementDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            onCreate={(movement) => createMovement.mutate(movement)}
          />
        </div>
      </div>

      {createdMovement ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Created <span className="font-semibold">{createdMovement.code}</span> for {createdMovement.productCode}.
          </span>
        </div>
      ) : null}

      {listQuery.isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <Package className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-base font-semibold">Couldn&apos;t load your movements</p>
              <p className="text-sm text-muted-foreground">
                Something went wrong fetching your stock movements. Please try again.
              </p>
            </div>
            <Button variant="outline" onClick={() => void listQuery.refetch()}>
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
          <Skeleton className="h-80 rounded-md" />
        </div>
      ) : data.items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <Package className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            {hasActiveFilters ? (
              <>
                <div>
                  <p className="text-base font-semibold">No matching movements</p>
                  <p className="text-sm text-muted-foreground">
                    Try adjusting your search or clearing the type filter.
                  </p>
                </div>
                <Button variant="outline" onClick={clearFilters}>
                  <X className="mr-2 h-4 w-4" aria-hidden="true" />
                  Clear filters
                </Button>
              </>
            ) : (
              <>
                <div>
                  <p className="text-base font-semibold">No movements yet</p>
                  <p className="text-sm text-muted-foreground">
                    Record your first stock movement to get started.
                  </p>
                </div>
                <Button onClick={() => setDialogOpen(true)}>New movement</Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Total movements" value={String(data.meta.total)} hint="Across all types" />
            <StatCard label="In qty" value={formatNumber(inQty)} hint="Received" />
            <StatCard label="Out qty" value={formatNumber(outQty)} hint="Shipped" />
            <StatCard label="Adjustments" value={String(adjustCount)} hint="Adjustment entries" />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-sm">
              <Search
                className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search movements…"
                aria-label="Search movements"
                className="h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            {view === "table" ? (
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-44" aria-label="Filter by type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {MOVEMENT_TYPES.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </div>

          {view === "board" ? (
            <StockMovementsBoard movements={data.items} />
          ) : (
            <DataTable
              columns={[
                {
                  accessorKey: "code",
                  header: ({ column }) => <DataTableColumnHeader column={column} title="Code" />,
                  cell: ({ row }) => (
                    <span className="font-medium tabular-nums text-foreground">{row.original.code}</span>
                  ),
                },
                {
                  accessorKey: "type",
                  header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
                  cell: ({ row }) => <MovementTypeBadge type={row.original.type} />,
                },
                {
                  accessorKey: "productCode",
                  header: ({ column }) => <DataTableColumnHeader column={column} title="Product" />,
                  cell: ({ row }) => {
                    const movement = row.original;
                    return (
                      <div className="flex flex-col">
                        <span className="text-foreground">{movement.productName}</span>
                        <span className="text-xs tabular-nums text-muted-foreground">{movement.productCode}</span>
                      </div>
                    );
                  },
                },
                {
                  accessorKey: "quantity",
                  header: ({ column }) => <DataTableColumnHeader column={column} title="Quantity" />,
                  cell: ({ row }) => {
                    const movement = row.original;
                    return (
                      <span className="font-medium tabular-nums text-foreground">
                        {formatNumber(movement.quantity)} {movement.uom}
                      </span>
                    );
                  },
                },
                {
                  accessorKey: "fromWarehouse",
                  header: ({ column }) => <DataTableColumnHeader column={column} title="Warehouse" />,
                  cell: ({ row }) => {
                    const movement = row.original;
                    return (
                      <div className="flex items-center gap-1.5">
                        <span className="tabular-nums text-muted-foreground">{movement.fromWarehouse ?? "—"}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60" aria-hidden="true" />
                        <span className="tabular-nums text-muted-foreground">{movement.toWarehouse ?? "—"}</span>
                      </div>
                    );
                  },
                },
                {
                  accessorKey: "date",
                  header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
                  cell: ({ row }) => (
                    <span className="tabular-nums text-muted-foreground">{formatMovementDate(row.original.date)}</span>
                  ),
                },
                {
                  accessorKey: "reason",
                  header: ({ column }) => <DataTableColumnHeader column={column} title="Reason" />,
                  cell: ({ row }) => <span className="text-muted-foreground">{row.original.reason ?? "—"}</span>,
                },
                {
                  accessorKey: "createdBy",
                  header: ({ column }) => <DataTableColumnHeader column={column} title="Created by" />,
                  cell: ({ row }) => <span className="text-muted-foreground">{row.original.createdBy ?? "—"}</span>,
                },
              ]}
              data={data.items}
              loading={listQuery.isFetching}
              searchable
              globalSearchPlaceholder="Search movements…"
              getRowId={(movement) => (movement as StockMovement).code}
              initialSorting={[{ id: "date", desc: true }]}
              emptyState={{
                title: "No movements yet",
                description: "Record your first stock movement to get started.",
              }}
              noResultsState={{
                title: "No matching movements",
                description: "Try adjusting your search or clear the filters.",
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
