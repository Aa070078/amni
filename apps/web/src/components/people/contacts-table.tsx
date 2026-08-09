"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, X } from "lucide-react";
import {
  Badge,
  Button,
  DataTable,
  DataTableColumnHeader,
  DataTableFacetedFilter,
  type LegacyColumnDef,
} from "@amni/ui";
import type { ContactStatus, ContactSummary } from "@amni/shared";
import { formatDate } from "@/src/lib/format";
import { contactStatusBadge, contactStatusLabel } from "@/src/lib/people";

function StatusBadge({ status }: { status: ContactStatus }) {
  return <Badge variant={contactStatusBadge[status]}>{contactStatusLabel(status)}</Badge>;
}

function contactName(contact: ContactSummary): string {
  return `${contact.firstName} ${contact.lastName}`;
}

interface ContactsTableProps {
  data: ContactSummary[];
  loading?: boolean;
}

export function ContactsTable({ data, loading = false }: ContactsTableProps) {
  const router = useRouter();
  const [resetKey, setResetKey] = useState(0);

  const columns: LegacyColumnDef<ContactSummary>[] = [
    {
      id: "name",
      accessorFn: (row) => contactName(row),
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => (
        <Link
          href={`/people/contacts/${row.original.id}`}
          onClick={(event) => event.stopPropagation()}
          className="font-medium text-foreground hover:underline"
        >
          {contactName(row.original)}
        </Link>
      ),
    },
    {
      accessorKey: "title",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Title" />,
      cell: ({ row }) => row.original.title || "—",
    },
    {
      accessorKey: "department",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Department" />,
      cell: ({ row }) => row.original.department || "—",
      filterFn: (row, columnId, filterValue) => {
        if (!Array.isArray(filterValue) || filterValue.length === 0) return true;
        return filterValue.includes(String(row.getValue(columnId)));
      },
    },
    {
      accessorKey: "email",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
      cell: ({ row }) => row.original.email || "—",
    },
    {
      accessorKey: "phone",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Phone" />,
      cell: ({ row }) => row.original.phone || "—",
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
      globalSearchPlaceholder="Search contacts…"
      getRowId={(row) => row.id}
      onRowClick={(row) => router.push(`/people/contacts/${row.id}`)}
      pageSizeOptions={[10, 20, 50]}
      toolbar={(table) => (
        <div className="flex items-center gap-2">
          <DataTableFacetedFilter
            column={table.getColumn("department")}
            title="Department"
            options={[
              { label: "Procurement", value: "Procurement" },
              { label: "Operations", value: "Operations" },
              { label: "Finance", value: "Finance" },
              { label: "Administration", value: "Administration" },
              { label: "Legal", value: "Legal" },
            ]}
          />
          <DataTableFacetedFilter
            column={table.getColumn("status")}
            title="Status"
            options={[
              { label: "Active", value: "active" },
              { label: "Inactive", value: "inactive" },
            ]}
          />
        </div>
      )}
      emptyState={{
        icon: <Users className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
        title: "No contacts yet",
        description: "Add your first contact to keep people reachable.",
      }}
      noResultsState={{
        title: "No contacts match",
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
