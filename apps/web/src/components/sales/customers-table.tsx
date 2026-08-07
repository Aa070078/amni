"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, X } from "lucide-react";
import {
  Badge,
  Button,
  DataTable,
  DataTableColumnHeader,
  DataTableFacetedFilter,
  type LegacyColumnDef,
} from "@amni/ui";
import type { SalesCustomer } from "@amni/shared";
import { formatCurrency, formatDate, formatNumber } from "@/src/lib/format";

const TYPE_OPTIONS = [
  { label: "Company", value: "company" },
  { label: "Individual", value: "individual" },
];

const STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

function TypeBadge({ type }: { type: SalesCustomer["type"] }) {
  return (
    <Badge variant={type === "company" ? "outline" : "secondary"}>
      {type === "company" ? "Company" : "Individual"}
    </Badge>
  );
}

function StatusBadge({ status }: { status: SalesCustomer["status"] }) {
  return (
    <Badge variant={status === "active" ? "default" : "secondary"}>{status}</Badge>
  );
}

interface CustomersTableProps {
  data: SalesCustomer[];
  loading?: boolean;
  bulkActions?: (selected: SalesCustomer[]) => React.ReactNode;
  onNewCustomer?: () => void;
}

export function CustomersTable({ data, loading = false, bulkActions, onNewCustomer }: CustomersTableProps) {
  const router = useRouter();
  const [resetKey, setResetKey] = useState(0);

  const columns: LegacyColumnDef<SalesCustomer>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => (
        <Link
          href={`/sales/customers/${row.original.id}`}
          onClick={(event) => event.stopPropagation()}
          className="font-medium text-foreground hover:underline"
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: "type",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
      cell: ({ row }) => <TypeBadge type={row.original.type} />,
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
      accessorKey: "city",
      header: ({ column }) => <DataTableColumnHeader column={column} title="City" />,
      cell: ({ row }) => row.original.city || "—",
    },
    {
      accessorKey: "totalOrders",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Orders" />,
      cell: ({ row }) => formatNumber(row.original.totalOrders),
    },
    {
      accessorKey: "totalValue",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Total value" />,
      cell: ({ row }) => formatCurrency(row.original.totalValue, row.original.currency),
    },
    {
      accessorKey: "outstanding",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Outstanding" />,
      cell: ({ row }) => formatCurrency(row.original.outstanding, row.original.currency),
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
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
      globalSearchPlaceholder="Search customers…"
      enableRowSelection
      getRowId={(row) => row.id}
      onRowClick={(row) => router.push(`/sales/customers/${row.id}`)}
      bulkActions={bulkActions}
      pageSizeOptions={[10, 20, 50]}
      toolbar={(table) => (
        <div className="flex items-center gap-2">
          <DataTableFacetedFilter column={table.getColumn("type")} title="Type" options={TYPE_OPTIONS} />
          <DataTableFacetedFilter column={table.getColumn("status")} title="Status" options={STATUS_OPTIONS} />
        </div>
      )}
      emptyState={{
        icon: <Users className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
        title: "No customers yet",
        description: "Add your first customer to start recording sales.",
        action: onNewCustomer ? (
          <Button size="sm" onClick={onNewCustomer}>
            Add customer
          </Button>
        ) : undefined,
      }}
      noResultsState={{
        title: "No customers match",
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
