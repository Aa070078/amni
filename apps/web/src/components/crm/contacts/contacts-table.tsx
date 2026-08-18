"use client";

import Link from "next/link";
import type { CrmContact } from "@amni/shared";
import { Badge, DataTable, DataTableColumnHeader } from "@amni/ui";

interface ContactsTableProps {
  data: CrmContact[];
  loading?: boolean;
}

export function ContactsTable({ data, loading }: ContactsTableProps) {
  return (
    <DataTable
      columns={[
        {
          accessorKey: "firstName",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
          cell: ({ row }) => {
            const contact = row.original;
            const name = `${contact.firstName} ${contact.lastName ?? ""}`.trim();
            return (
              <div className="flex flex-col">
                <Link
                  href={`/crm/contacts/${contact.code}`}
                  className="font-medium text-foreground hover:text-primary hover:underline"
                >
                  {name}
                </Link>
                <span className="text-xs tabular-nums text-muted-foreground">{contact.code}</span>
              </div>
            );
          },
        },
        {
          accessorKey: "company",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Company" />,
          cell: ({ row }) => {
            const contact = row.original;
            if (contact.organizationCode) {
              return (
                <Link
                  href={`/crm/organizations/${contact.organizationCode}`}
                  className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                >
                  {contact.company || contact.organizationCode}
                </Link>
              );
            }
            return <span className="text-muted-foreground">{contact.company ?? "—"}</span>;
          },
        },
        {
          accessorKey: "jobTitle",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Job title" />,
          cell: ({ row }) => (
            <span className="text-muted-foreground">
              {[row.original.jobTitle, row.original.department].filter(Boolean).join(", ") || "—"}
            </span>
          ),
        },
        {
          accessorKey: "email",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
          cell: ({ row }) => <span className="text-muted-foreground">{row.original.email ?? "—"}</span>,
        },
        {
          accessorKey: "mobileNo",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Mobile" />,
          cell: ({ row }) => <span className="tabular-nums text-muted-foreground">{row.original.mobileNo ?? "—"}</span>,
        },
        {
          accessorKey: "isPrimary",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Primary" />,
          cell: ({ row }) =>
            row.original.isPrimary ? (
              <Badge variant="success">Primary</Badge>
            ) : (
              <span className="text-muted-foreground">—</span>
            ),
        },
      ]}
      data={data}
      loading={loading}
      searchable
      globalSearchPlaceholder="Search contacts…"
      getRowId={(contact) => (contact as CrmContact).code}
      initialSorting={[{ id: "firstName", desc: false }]}
      emptyState={{
        title: "No contacts yet",
        description: "Create your first contact to start building relationships.",
      }}
      noResultsState={{
        title: "No matching contacts",
        description: "Try adjusting your search or clear the filters.",
      }}
    />
  );
}
