"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ReceiptText, X } from "lucide-react";
import {
  Badge,
  Button,
  DataTable,
  DataTableColumnHeader,
  DataTableFacetedFilter,
  type LegacyColumnDef,
} from "@amni/ui";
import type { PurchaseInvoiceStatus, PurchaseInvoiceSummary } from "@amni/shared";
import { formatCurrency, formatDate } from "@/src/lib/format";
import { purchaseInvoiceStatusBadge, purchaseInvoiceStatusLabel } from "@/src/lib/purchasing";

function StatusBadge({ status }: { status: PurchaseInvoiceStatus }) {
  return <Badge variant={purchaseInvoiceStatusBadge[status]}>{purchaseInvoiceStatusLabel(status)}</Badge>;
}

interface PurchaseInvoicesTableProps {
  data: PurchaseInvoiceSummary[];
  loading?: boolean;
}

export function PurchaseInvoicesTable({ data, loading = false }: PurchaseInvoicesTableProps) {
  const router = useRouter();
  const [resetKey, setResetKey] = useState(0);

  const columns: LegacyColumnDef<PurchaseInvoiceSummary>[] = [
    {
      accessorKey: "number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Invoice" />,
      cell: ({ row }) => (
        <Link
          href={`/purchasing/purchase-invoices/${row.original.id}`}
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
      header: ({ column }) => <DataTableColumnHeader column={column} title="Dated" />,
      cell: ({ row }) => formatDate(row.original.date),
    },
    {
      accessorKey: "dueDate",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Due" />,
      cell: ({ row }) => (row.original.dueDate ? formatDate(row.original.dueDate) : "—"),
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
      accessorKey: "paid",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Paid" />,
      cell: ({ row }) => formatCurrency(row.original.paid, row.original.currency),
    },
    {
      accessorKey: "outstanding",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Outstanding" />,
      cell: ({ row }) => formatCurrency(row.original.outstanding, row.original.currency),
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
      globalSearchPlaceholder="Search purchase invoices…"
      getRowId={(row) => row.id}
      onRowClick={(row) => router.push(`/purchasing/purchase-invoices/${row.id}`)}
      pageSizeOptions={[10, 20, 50]}
      toolbar={(table) => (
        <div className="flex items-center gap-2">
          <DataTableFacetedFilter
            column={table.getColumn("status")}
            title="Status"
            options={[
              { label: "Draft", value: "draft" },
              { label: "Submitted", value: "submitted" },
              { label: "Partially paid", value: "partially_paid" },
              { label: "Paid", value: "paid" },
              { label: "Cancelled", value: "cancelled" },
            ]}
          />
        </div>
      )}
      emptyState={{
        icon: <ReceiptText className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
        title: "No purchase invoices yet",
        description: "Supplier invoices will appear here once recorded.",
      }}
      noResultsState={{
        title: "No purchase invoices match",
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
