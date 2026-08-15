"use client";

import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { CrmCallLog } from "@amni/shared";
import { DataTable, DataTableColumnHeader } from "@amni/ui";
import { formatCrmDateTime } from "@/src/lib/crm";
import { CrmCallStatusBadge, CrmReferenceChip, formatCallDuration } from "../crm-badges";

interface CallLogsTableProps {
  data: CrmCallLog[];
  loading?: boolean;
}

export function CallLogsTable({ data, loading }: CallLogsTableProps) {
  return (
    <DataTable
      columns={[
        {
          accessorKey: "direction",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Direction" />,
          cell: ({ row }) => {
            const call = row.original;
            const Icon = call.direction === "inbound" ? ArrowDownLeft : ArrowUpRight;
            return (
              <span className="inline-flex items-center gap-1.5 text-sm capitalize">
                <Icon
                  className={call.direction === "inbound" ? "h-4 w-4 text-success" : "h-4 w-4 text-primary"}
                  aria-hidden="true"
                />
                {call.direction}
              </span>
            );
          },
        },
        {
          accessorKey: "phoneNumber",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Number" />,
          cell: ({ row }) => <span className="tabular-nums">{row.original.phoneNumber}</span>,
        },
        {
          accessorKey: "status",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
          cell: ({ row }) => <CrmCallStatusBadge status={row.original.status} />,
        },
        {
          accessorKey: "durationSeconds",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Duration" />,
          cell: ({ row }) => (
            <span className="tabular-nums text-muted-foreground">{formatCallDuration(row.original.durationSeconds)}</span>
          ),
        },
        {
          accessorKey: "agent",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Agent" />,
          cell: ({ row }) => <span className="text-muted-foreground">{row.original.agent ?? "—"}</span>,
        },
        {
          id: "reference",
          header: "Related to",
          cell: ({ row }) => (
            <CrmReferenceChip
              referenceType={row.original.referenceType}
              referenceCode={row.original.referenceCode}
            />
          ),
        },
        {
          accessorKey: "startTime",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Started" />,
          cell: ({ row }) => (
            <span className="tabular-nums text-muted-foreground">{formatCrmDateTime(row.original.startTime)}</span>
          ),
        },
      ]}
      data={data}
      loading={loading}
      searchable
      globalSearchPlaceholder="Search call logs…"
      getRowId={(call) => (call as CrmCallLog).id}
      initialSorting={[{ id: "startTime", desc: true }]}
      emptyState={{
        title: "No calls logged yet",
        description: "Log your first call to start building call history.",
      }}
      noResultsState={{
        title: "No matching calls",
        description: "Try adjusting your search or filters.",
      }}
    />
  );
}
