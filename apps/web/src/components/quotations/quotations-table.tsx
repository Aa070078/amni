"use client";

import Link from "next/link";
import { type Quotation } from "@amni/shared";
import { DataTable, DataTableColumnHeader } from "@amni/ui";
import { formatCurrency } from "@/src/lib/format";
import { formatQuotationDate } from "@/src/lib/quotations";
import { QuotationStatusBadge } from "./quotation-status";

interface QuotationsTableProps {
  data: Quotation[];
  loading?: boolean;
}

export function QuotationsTable({ data, loading }: QuotationsTableProps) {
  return (
    <DataTable
      columns={[
        {
          accessorKey: "code",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Code" />,
          cell: ({ row }) => {
            const quotation = row.original;
            return (
              <Link
                href={`/sales/quotations/${quotation.code}`}
                className="font-medium tabular-nums text-foreground hover:text-primary hover:underline"
              >
                {quotation.code}
              </Link>
            );
          },
        },
        {
          accessorFn: (quotation) => quotation.customer.name,
          id: "customer",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Customer" />,
          cell: ({ row }) => {
            const quotation = row.original;
            return (
              <div className="flex flex-col">
                <span className="text-foreground">{quotation.customer.name}</span>
                <span className="text-xs tabular-nums text-muted-foreground">{quotation.customer.code}</span>
              </div>
            );
          },
        },
        {
          accessorKey: "date",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
          cell: ({ row }) => (
            <span className="tabular-nums text-muted-foreground">{formatQuotationDate(row.original.date)}</span>
          ),
        },
        {
          accessorKey: "validUntil",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Valid until" />,
          cell: ({ row }) => (
            <span className="tabular-nums text-muted-foreground">
              {formatQuotationDate(row.original.validUntil)}
            </span>
          ),
        },
        {
          accessorKey: "status",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
          cell: ({ row }) => <QuotationStatusBadge status={row.original.status} />,
        },
        {
          accessorFn: (quotation) => quotation.summary.total,
          id: "total",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Total" />,
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
      ]}
      data={data}
      loading={loading}
      getRowId={(quotation) => (quotation as Quotation).code}
      initialSorting={[{ id: "date", desc: true }]}
      emptyState={{
        title: "No quotations yet",
        description: "Create your first quotation to get started.",
      }}
      noResultsState={{
        title: "No matching quotations",
        description: "Try adjusting your search or clear the filters.",
      }}
    />
  );
}
