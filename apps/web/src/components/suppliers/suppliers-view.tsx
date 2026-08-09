"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { LegacyColumnDef } from "@tanstack/react-table/legacy";
import { CheckCircle2, FileText, Search, TrendingUp, Truck, Users } from "lucide-react";
import type { Supplier } from "@amni/shared";
import {
  Button,
  Card,
  CardContent,
  DataTable,
  DataTableColumnHeader,
  Skeleton,
} from "@amni/ui";
import { formatCurrency } from "@/src/lib/format";
import { suppliersClient } from "@/src/lib/suppliers";
import { NewSupplierDialog } from "./new-supplier-dialog";
import { SupplierStatusBadge } from "./supplier-status";

const LIST_COLUMNS: LegacyColumnDef<Supplier>[] = [
  {
    accessorKey: "code",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Supplier" />,
    cell: ({ row }) => {
      const supplier = row.original;
      return (
        <Link
          href={`/purchasing/suppliers/${supplier.code}`}
          className="font-medium tabular-nums text-foreground hover:text-primary hover:underline"
        >
          {supplier.code}
        </Link>
      );
    },
  },
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => <span className="text-foreground">{row.original.name}</span>,
  },
  {
    accessorKey: "group",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Group" />,
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.group}</span>,
  },
  {
    accessorKey: "email",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.email ?? "—"}</span>,
  },
  {
    accessorKey: "currency",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Currency" />,
    cell: ({ row }) => <span className="tabular-nums text-muted-foreground">{row.original.currency}</span>,
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => <SupplierStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "outstanding",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Outstanding" />,
    cell: ({ row }) => (
      <span className="font-medium tabular-nums text-foreground">
        {formatCurrency(row.original.outstanding, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: "totalPurchases",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Purchases" />,
    cell: ({ row }) => (
      <span className="font-medium tabular-nums text-foreground">
        {formatCurrency(row.original.totalPurchases, row.original.currency)}
      </span>
    ),
  },
];

export function SuppliersView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createdSupplier, setCreatedSupplier] = useState<Supplier | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!createdSupplier) return;
    const timer = setTimeout(() => setCreatedSupplier(null), 5000);
    return () => clearTimeout(timer);
  }, [createdSupplier]);

  const listQuery = useQuery({
    queryKey: ["suppliers", "list", debouncedSearch],
    queryFn: () =>
      suppliersClient.list({
        page: 1,
        pageSize: 100,
        sortBy: "createdAt",
        sortDir: "desc",
        q: debouncedSearch.trim() || undefined,
      }),
    placeholderData: (previous) => previous,
  });

  const createSupplier = (supplier: Supplier) => {
    setCreatedSupplier(supplier);
    void queryClient.invalidateQueries({ queryKey: ["suppliers", "list"] });
  };

  const data = listQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Suppliers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage the vendors you buy from and track what&apos;s outstanding.
          </p>
        </div>
        <NewSupplierDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreate={createSupplier} />
      </div>

      {createdSupplier ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Created{" "}
            <Link
              href={`/purchasing/suppliers/${createdSupplier.code}`}
              className="font-semibold underline underline-offset-2"
            >
              {createdSupplier.code}
            </Link>{" "}
            for {createdSupplier.name}.
          </span>
        </div>
      ) : null}

      {listQuery.isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <TrendingUp className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-base font-semibold">Couldn&apos;t load your suppliers</p>
              <p className="text-sm text-muted-foreground">
                Something went wrong fetching your suppliers. Please try again.
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
            <Users className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-base font-semibold">
                {debouncedSearch ? "No matching suppliers" : "No suppliers yet"}
              </p>
              <p className="text-sm text-muted-foreground">
                {debouncedSearch
                  ? "Try adjusting your search."
                  : "Add your first supplier to start purchasing."}
              </p>
            </div>
            {debouncedSearch ? (
              <Button variant="outline" onClick={() => setSearch("")}>
                Clear search
              </Button>
            ) : (
              <Button onClick={() => setDialogOpen(true)}>New supplier</Button>
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
              placeholder="Search suppliers…"
              aria-label="Search suppliers"
              className="h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-sm"
            />
          </div>

          <DataTable
            columns={LIST_COLUMNS}
            data={data.items}
            searchable
            globalSearchPlaceholder="Search suppliers…"
            getRowId={(supplier) => (supplier as Supplier).code}
            initialSorting={[{ id: "name", desc: false }]}
            emptyState={{
              icon: <Truck className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
              title: "No suppliers yet",
              description: "Add your first supplier to start purchasing.",
            }}
            noResultsState={{
              icon: <FileText className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
              title: "No matching suppliers",
              description: "Try adjusting your search or clear the filters.",
            }}
          />
        </>
      )}
    </div>
  );
}
