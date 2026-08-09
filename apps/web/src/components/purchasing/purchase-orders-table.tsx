"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ClipboardList, X } from "lucide-react";
import {
  Badge,
  Button,
  DataTable,
  DataTableColumnHeader,
  DataTableFacetedFilter,
  type LegacyColumnDef,
} from "@amni/ui";
import type { PurchaseOrderStatus, PurchaseOrderSummary } from "@amni/shared";
import { formatCurrency, formatDate } from "@/src/lib/format";
import { purchaseOrderStatusBadge, purchaseOrderStatusLabel } from "@/src/lib/purchasing";

function StatusBadge({ status }: { status: PurchaseOrderStatus }) {
  return <Badge variant={purchaseOrderStatusBadge[status]}>{purchaseOrderStatusLabel(status)}</Badge>;
}

interface PurchaseOrdersTableProps {
  data: PurchaseOrderSummary[];
  loading?: boolean;
}

export function PurchaseOrdersTable({ data, loading = false }: PurchaseOrdersTableProps) {
  const router = useRouter();
  const [resetKey, setResetKey] = useState(0);

  const columns: LegacyColumnDef<PurchaseOrderSummary>[] = [
    {
      accessorKey: "number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Order" />,
      cell: ({ row }) => (
        <Link
          href={`/purchasing/purchase-orders/${row.original.id}`}
          onClick={(event) => event.stopPropagation()}
          className="font-medium text-foreground hover:underline"
        >
          {row.original.number}
        </Link>
      ),
    },
    {
      accessorKey: "supplierName",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Supplier" />,
      cell: ({ row }) => row.original.supplierName,
      filterFn: (row, columnId, filterValue) => {
        if (!Array.isArray(filterValue) || filterValue.length === 0) return true;
        return filterValue.includes(String(row.getValue(columnId)));
      },
    },
    {
      accessorKey: "date",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Ordered" />,
      cell: ({ row }) => formatDate(row.original.date),
    },
    {
      accessorKey: "expectedDate",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Expected" />,
      cell: ({ row }) => (row.original.expectedDate ? formatDate(row.original.expectedDate) : "—"),
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
      accessorKey: "total",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Total" />,
      cell: ({ row }) => formatCurrency(row.original.total, row.original.currency),
    },
  ];

  return (
    <DataTable
      key={resetKey}
      columns={columns}
      data={data}
      loading={loading}
      searchable
      globalSearchPlaceholder="Search purchase orders…"
      getRowId={(row) => row.id}
      onRowClick={(row) => router.push(`/purchasing/purchase-orders/${row.id}`)}
      pageSizeOptions={[10, 20, 50]}
      toolbar={(table) => (
        <div className="flex items-center gap-2">
          <DataTableFacetedFilter
            column={table.getColumn("status")}
            title="Status"
            options={[
              { label: "Draft", value: "draft" },
              { label: "Submitted", value: "submitted" },
              { label: "Received", value: "received" },
              { label: "Cancelled", value: "cancelled" },
            ]}
          />
        </div>
      )}
      emptyState={{
        icon: <ClipboardList className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
        title: "No purchase orders yet",
        description: "Create your first purchase order to order stock from a supplier.",
      }}
      noResultsState={{
        title: "No purchase orders match",
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
