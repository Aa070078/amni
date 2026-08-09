"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  MapPin,
  Package,
  Star,
  UserRound,
  Warehouse as WarehouseIcon,
} from "lucide-react";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  DataTableColumnHeader,
  Skeleton,
} from "@amni/ui";
import { WarehousesApiError, warehousesClient } from "@/src/lib/warehouses";
import { WarehouseStatusBadge } from "./warehouse-status";

interface WarehouseDetailViewProps {
  code: string;
}

export function WarehouseDetailView({ code }: WarehouseDetailViewProps) {
  const detailQuery = useQuery({
    queryKey: ["warehouses", "detail", code],
    queryFn: () => warehousesClient.detail(code),
    retry: (failureCount, error) => {
      if (error instanceof WarehousesApiError && error.status === 404) return false;
      return failureCount < 2;
    },
  });

  if (detailQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-36 rounded-lg" />
        <div className="space-y-2" aria-hidden>
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-11 rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  if (detailQuery.isError) {
    const is404 = detailQuery.error instanceof WarehousesApiError && detailQuery.error.status === 404;
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
          <WarehouseIcon className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-base font-semibold">
              {is404 ? "Warehouse not found" : "Couldn&apos;t load this warehouse"}
            </p>
            <p className="text-sm text-muted-foreground">
              {is404
                ? `No warehouse matches ${code}. It may have been removed.`
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
              <Link href="/inventory/warehouses">
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Back to warehouses
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const warehouse = detailQuery.data;
  if (!warehouse) return null;

  const hasLowStock = warehouse.lowStock.length > 0;

  return (
    <div className="space-y-6">
      <Link
        href="/inventory/warehouses"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Warehouses
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{warehouse.name}</h1>
              <span className="text-sm tabular-nums text-muted-foreground">{warehouse.code}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <WarehouseStatusBadge status={warehouse.status} />
              {warehouse.isDefault ? (
                <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <Star className="h-3.5 w-3.5 text-warning" aria-hidden="true" />
                  Default
                </span>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
          <CardDescription>Location and management for this warehouse.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <DetailRow icon={MapPin} label="Location" value={warehouse.location ?? "—"} />
          <DetailRow icon={UserRound} label="Manager" value={warehouse.manager ?? "—"} />
          <DetailRow
            icon={Star}
            label="Default warehouse"
            value={warehouse.isDefault ? "Yes" : "No"}
          />
          <DetailRow icon={Package} label="Stock lines" value={`${warehouse.stock.length}`} />
        </CardContent>
      </Card>

      {hasLowStock ? (
        <Card className="border-warning/40 bg-warning/10">
          <CardContent className="flex flex-col gap-2 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-warning">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {warehouse.lowStock.length} {warehouse.lowStock.length === 1 ? "item" : "items"} below
              reorder level
            </p>
            <ul className="grid gap-1.5 text-sm text-muted-foreground sm:grid-cols-2">
              {warehouse.lowStock.map((row) => (
                <li key={row.productCode} className="flex items-baseline justify-between gap-2">
                  <span className="font-medium tabular-nums text-foreground">{row.productCode}</span>
                  <span className="tabular-nums">
                    {row.onHand} on hand · reorder at {row.reorderLevel}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-tight">Stock levels</h2>
        <span className="text-sm tabular-nums text-muted-foreground">
          {warehouse.stock.length} {warehouse.stock.length === 1 ? "line" : "lines"}
        </span>
      </div>

      <DataTable
        columns={[
          {
            accessorKey: "productCode",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Product" />,
            cell: ({ row }) => (
              <span className="font-medium tabular-nums text-foreground">{row.original.productCode}</span>
            ),
          },
          {
            accessorKey: "onHand",
            header: ({ column }) => <DataTableColumnHeader column={column} title="On hand" />,
            cell: ({ row }) => {
              const stock = row.original;
              const isLow = stock.onHand < stock.reorderLevel;
              return (
                <span className={`tabular-nums ${isLow ? "font-medium text-warning" : "text-foreground"}`}>
                  {stock.onHand}
                </span>
              );
            },
          },
          {
            accessorKey: "reserved",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Reserved" />,
            cell: ({ row }) => (
              <span className="tabular-nums text-muted-foreground">{row.original.reserved}</span>
            ),
          },
          {
            accessorKey: "available",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Available" />,
            cell: ({ row }) => (
              <span className="tabular-nums text-muted-foreground">{row.original.available}</span>
            ),
          },
          {
            accessorKey: "reorderLevel",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Reorder level" />,
            cell: ({ row }) => (
              <span className="tabular-nums text-muted-foreground">{row.original.reorderLevel}</span>
            ),
          },
        ]}
        data={warehouse.stock}
        getRowId={(stock) => stock.productCode}
        initialSorting={[{ id: "productCode", desc: false }]}
        emptyState={{
          title: "No stock levels yet",
          description: "Add stock movements to start tracking levels for this warehouse.",
        }}
        noResultsState={{
          title: "No matching stock lines",
          description: "Try adjusting your search or clear the filters.",
        }}
      />
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
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
