"use client";

import Link from "next/link";
import type { Organization, OrganizationIndustry, OrganizationTerritory } from "@amni/shared";
import { ORGANIZATION_INDUSTRIES, ORGANIZATION_TERRITORIES } from "@amni/shared";
import { DataTable, DataTableColumnHeader, DataTableFacetedFilter } from "@amni/ui";
import { OrgStatusBadge } from "../crm-badges";

interface OrganizationsTableProps {
  data: Organization[];
  loading?: boolean;
}

function industryLabel(value: OrganizationIndustry | undefined): string {
  return ORGANIZATION_INDUSTRIES.find((entry) => entry.value === value)?.label ?? value ?? "—";
}

function territoryLabel(value: OrganizationTerritory | undefined): string {
  return ORGANIZATION_TERRITORIES.find((entry) => entry.value === value)?.label ?? value ?? "—";
}

export function OrganizationsTable({ data, loading }: OrganizationsTableProps) {
  return (
    <DataTable
      columns={[
        {
          accessorKey: "name",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Company" />,
          cell: ({ row }) => {
            const org = row.original;
            return (
              <div className="flex flex-col">
                <Link
                  href={`/sales/crm/organizations/${org.code}`}
                  className="font-medium text-foreground hover:text-primary hover:underline"
                >
                  {org.name}
                </Link>
                <span className="text-xs tabular-nums text-muted-foreground">{org.code}</span>
              </div>
            );
          },
        },
        {
          accessorKey: "status",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Status">
              <DataTableFacetedFilter
                column={column}
                title="Status"
                options={[
                  { label: "Lead", value: "lead" },
                  { label: "Active", value: "active" },
                  { label: "Inactive", value: "inactive" },
                ]}
              />
            </DataTableColumnHeader>
          ),
          cell: ({ row }) => <OrgStatusBadge status={row.original.status} />,
        },
        {
          accessorKey: "industry",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Industry">
              <DataTableFacetedFilter
                column={column}
                title="Industry"
                options={ORGANIZATION_INDUSTRIES.map(({ value, label }) => ({ label, value }))}
              />
            </DataTableColumnHeader>
          ),
          cell: ({ row }) => <span className="text-muted-foreground">{industryLabel(row.original.industry)}</span>,
        },
        {
          accessorKey: "territory",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Territory" />,
          cell: ({ row }) => <span className="capitalize text-muted-foreground">{territoryLabel(row.original.territory)}</span>,
        },
        {
          accessorKey: "email",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
          cell: ({ row }) => (
            <span className="text-muted-foreground">{row.original.email ?? "—"}</span>
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
      searchable
      globalSearchPlaceholder="Search companies…"
      getRowId={(org) => (org as Organization).code}
      initialSorting={[{ id: "name", desc: false }]}
      emptyState={{
        title: "No companies yet",
        description: "Create your first company to start building relationships.",
      }}
      noResultsState={{
        title: "No matching companies",
        description: "Try adjusting your search or clear the filters.",
      }}
    />
  );
}
