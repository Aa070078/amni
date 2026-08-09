"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Store, X } from "lucide-react";
import {
  Badge,
  Button,
  DataTable,
  DataTableColumnHeader,
  DataTableFacetedFilter,
  type LegacyColumnDef,
} from "@amni/ui";
import type { SupplierStatus, SupplierSummary } from "@amni/shared";
import { formatCurrency, formatDate } from "@/src/lib/format";
import { supplierStatusBadge, supplierStatusLabel } from "@/src/lib/purchasing";

function StatusBadge({ status }: { status: SupplierStatus }) {
  return <Badge variant={supplierStatusBadge[status]}>{supplierStatusLabel(status)}</Badge>;
}

interface SuppliersTableProps {
  data: SupplierSummary[];
  loading?: boolean;
}

export function SuppliersTable({ data, loading = false }: SuppliersTableProps) {
  const router = useRouter();
  const [resetKey, setResetKey] = useState(0);

  const columns: LegacyColumnDef<SupplierSummary>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => (
        <Link
          href={`/purchasing/suppliers/${row.original.id}`}
          onClick={(event) => event.stopPropagation()}
          className="font-medium text-foreground hover:underline"
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: "supplierGroup",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Group" />,
      cell: ({ row }) => row.original.supplierGroup || "—",
      filterFn: (row, columnId, filterValue) => {
        if (!Array.isArray(filterValue) || filterValue.length === 0) return true;
        return filterValue.includes(String(row.getValue(columnId)));
      },
    },
    {
      accessorKey: "territory",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Territory" />,
      cell: ({ row }) => row.original.territory || "—",
      filterFn: (row, columnId, filterValue) => {
        if (!Array.isArray(filterValue) || filterValue.length === 0) return true;
        return filterValue.includes(String(row.getValue(columnId)));
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
      filterFn: (row, columnId, filterValue) => {
        if (!Array.isArray(filterValue) || filterValue.length === 0) return true;
        return filterValue.includes(String(row.getValue(columnId)));
      },
    },
    {
      accessorKey: "balance",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Balance" />,
      cell: ({ row }) => formatCurrency(row.original.balance, row.original.currency),
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Added" />,
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
  ];

  return (
    <DataTable
      key={resetKey}
      columns={columns}
      data={data}
      loading={loading}
      searchable
      globalSearchPlaceholder="Search suppliers…"
      getRowId={(row) => row.id}
      onRowClick={(row) => router.push(`/purchasing/suppliers/${row.id}`)}
      pageSizeOptions={[10, 20, 50]}
      toolbar={(table) => (
        <div className="flex items-center gap-2">
          <DataTableFacetedFilter
            column={table.getColumn("supplierGroup")}
            title="Group"
            options={[{ label: "Raw Materials", value: "Raw Materials" }, { label: "Components", value: "Components" }, { label: "Services", value: "Services" }, { label: "Logistics", value: "Logistics" }]}
          />
          <DataTableFacetedFilter column={table.getColumn("status")} title="Status" options={[{ label: "Active", value: "active" }, { label: "Disabled", value: "disabled" }]} />
        </div>
      )}
      emptyState={{
        icon: <Store className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
        title: "No suppliers yet",
        description: "Add your first supplier to start recording purchases.",
      }}
      noResultsState={{
        title: "No suppliers match",
        description: "Try adjusting your search or filters.",
        action: (
          <Button variant="outline" size="sm" onClick={() => setResetKey((key) => key + 1)}>
            <X className="mr-2 h-4 w-4" aria-hidden="true" />
            Clear filters
          </Button>
        ),
      }}
    />
  );
}
