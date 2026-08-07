"use client";

import {
  type ColumnFiltersState,
  type ColumnVisibilityState,
  type SortingState,
} from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import {
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useLegacyTable,
  type LegacyColumnDef,
} from "@tanstack/react-table/legacy";
import type { RowData } from "@tanstack/react-table";
import { Search, X } from "lucide-react";
import * as React from "react";
import { cn } from "../../lib/cn";
import { Button } from "../button";
import { Checkbox } from "../checkbox";
import { Input } from "../input";
import { Skeleton } from "../skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../table";
import { DataTablePagination } from "./data-table-pagination";
import { DataTableViewOptions, type DataTableDensity } from "./data-table-view-options";

const DENSITY_KEY = "amni:data-table:density";

const densityRowClasses: Record<DataTableDensity, string> = {
  comfortable: "h-11",
  compact: "h-8",
  spacious: "h-14",
};

const densityCellClasses: Record<DataTableDensity, string> = {
  comfortable: "py-2",
  compact: "py-0.5",
  spacious: "py-3.5",
};

function getInitialDensity(): DataTableDensity {
  if (typeof window === "undefined") return "comfortable";
  const stored = window.localStorage.getItem(DENSITY_KEY) as DataTableDensity | null;
  return stored === "compact" || stored === "spacious" ? stored : "comfortable";
}

interface DataTableEmptyState {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

interface DataTableProps<TData extends RowData> {
  columns: LegacyColumnDef<TData>[];
  data: TData[];
  loading?: boolean;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  globalSearchPlaceholder?: string;
  searchable?: boolean;
  enableRowSelection?: boolean;
  getRowId?: (row: TData) => string;
  onRowClick?: (row: TData) => void;
  bulkActions?: (selectedRows: TData[]) => React.ReactNode;
  emptyState?: DataTableEmptyState;
  noResultsState?: DataTableEmptyState;
  toolbar?: React.ReactNode;
  pageSizeOptions?: number[];
  initialSorting?: SortingState;
  initialColumnVisibility?: ColumnVisibilityState;
  className?: string;
}

function DataTable<TData extends RowData>({
  columns,
  data,
  loading = false,
  hasActiveFilters = false,
  onClearFilters,
  globalSearchPlaceholder = "Search…",
  searchable = false,
  enableRowSelection = false,
  getRowId,
  onRowClick,
  bulkActions,
  emptyState = {},
  noResultsState = {},
  toolbar,
  pageSizeOptions,
  initialSorting,
  initialColumnVisibility,
  className,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>(initialSorting ?? []);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>(
    initialColumnVisibility ?? {},
  );
  const [rowSelection, setRowSelection] = React.useState({});
  const [globalFilter, setGlobalFilter] = React.useState<string>("");
  const [density, setDensity] = React.useState<DataTableDensity>(getInitialDensity);

  React.useEffect(() => {
    window.localStorage.setItem(DENSITY_KEY, density);
  }, [density]);

  const table = useLegacyTable<TData>({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    enableRowSelection,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getRowId,
    getCoreRowModel: getCoreRowModel<TData>(),
    getFilteredRowModel: getFilteredRowModel<TData>(),
    getPaginationRowModel: getPaginationRowModel<TData>(),
    getSortedRowModel: getSortedRowModel<TData>(),
    getFacetedRowModel: getFacetedRowModel<TData>(),
    getFacetedUniqueValues: getFacetedUniqueValues<TData>(),
  });

  const selectedRows = table.getSelectedRowModel().rows.map((row) => row.original);

  const hasNoData = !loading && data.length === 0;
  const isNoResults = !loading && data.length > 0 && table.getRowModel().rows.length === 0;

  const showEmpty = hasNoData && !hasActiveFilters;
  const showNoResults = hasNoData ? hasActiveFilters : isNoResults;

  return (
    <div className={cn("flex w-full flex-col gap-3", className)}>
      <div className="flex items-center gap-2">
        {searchable && (
          <div className="relative flex-1 sm:max-w-sm">
            <Search
              className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={globalFilter ?? ""}
              onChange={(event) => setGlobalFilter(event.target.value)}
              placeholder={globalSearchPlaceholder}
              className="pl-8"
              aria-label={globalSearchPlaceholder}
            />
          </div>
        )}
        {toolbar}
        <DataTableViewOptions
          table={table}
          density={density}
          onDensityChange={setDensity}
          densityLabel={`Current density: ${density}`}
        />
      </div>

      <div className="relative w-full overflow-auto rounded-md border">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {enableRowSelection && (
                  <TableHead
                    className={cn(
                      "w-12 bg-muted/50",
                      density === "compact" && "h-8",
                      density === "spacious" && "h-12",
                    )}
                  >
                    <Checkbox
                      checked={table.getIsAllPageRowsSelected()}
                      onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                      aria-label="Select all rows on page"
                    />
                  </TableHead>
                )}
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    className={cn(
                      "bg-muted/50",
                      density === "compact" && "h-8",
                      density === "spacious" && "h-12",
                    )}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 8 }).map((_, rowIndex) => (
                <TableRow key={`skeleton-${rowIndex}`} className="hover:bg-transparent">
                  {enableRowSelection && (
                    <TableCell className="w-12">
                      <Skeleton className="h-4 w-4" />
                    </TableCell>
                  )}
                  {columns.map((_, colIndex) => (
                    <TableCell key={`skeleton-cell-${colIndex}`}>
                      <Skeleton
                        className="h-4"
                        style={{ width: `${Math.min(90, 45 + ((rowIndex * 7 + colIndex * 13) % 45))}%` }}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : showEmpty ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length + (enableRowSelection ? 1 : 0)}
                  className="h-72 text-center"
                >
                  <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
                    {emptyState.icon}
                    <div className="flex flex-col gap-1">
                      <p className="text-base font-semibold">
                        {emptyState.title ?? "No data yet"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {emptyState.description ?? "Add your first record to get started."}
                      </p>
                    </div>
                    {emptyState.action}
                  </div>
                </TableCell>
              </TableRow>
            ) : showNoResults ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length + (enableRowSelection ? 1 : 0)}
                  className="h-72 text-center"
                >
                  <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
                    {noResultsState.icon}
                    <div className="flex flex-col gap-1">
                      <p className="text-base font-semibold">
                        {noResultsState.title ?? "No results found"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {noResultsState.description ?? "Try adjusting your search or filters."}
                      </p>
                    </div>
                    {noResultsState.action ?? (
                      <Button variant="outline" size="sm" onClick={onClearFilters}>
                        <X className="mr-2 h-4 w-4" aria-hidden="true" />
                        Clear filters
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={cn(
                    densityRowClasses[density],
                    onRowClick && "cursor-pointer",
                  )}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                >
                  {enableRowSelection && (
                    <TableCell
                      className={cn(densityCellClasses[density], "w-12")}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(value) => row.toggleSelected(!!value)}
                        aria-label={`Select row ${row.index + 1}`}
                      />
                    </TableCell>
                  )}
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={cn(densityCellClasses[density])}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {selectedRows.length > 0 && bulkActions && (
          <div className="sticky bottom-0 z-10 flex items-center justify-between gap-4 border-t bg-background/95 px-4 py-2.5 backdrop-blur">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{selectedRows.length}</span> selected
            </p>
            <div className="flex items-center gap-2">{bulkActions(selectedRows)}</div>
          </div>
        )}
      </div>

      {!loading && table.getRowModel().rows.length > 0 && (
        <DataTablePagination table={table} pageSizeOptions={pageSizeOptions} />
      )}
    </div>
  );
}

export { DataTable, type DataTableProps, type DataTableEmptyState };
