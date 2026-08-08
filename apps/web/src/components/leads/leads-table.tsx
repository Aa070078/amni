"use client";

import Link from "next/link";
import { ArrowRightLeft } from "lucide-react";
import { LEAD_STAGES, type Lead, type LeadStage } from "@amni/shared";
import {
  Button,
  DataTable,
  DataTableColumnHeader,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@amni/ui";
import { formatCurrency } from "@/src/lib/format";
import { formatLeadDate } from "@/src/lib/leads";
import { LeadStageBadge, leadStageLabel } from "./lead-stage";

interface LeadsTableProps {
  data: Lead[];
  loading?: boolean;
  onMoveStage: (code: string, stage: LeadStage) => void;
}

function StageMoveMenu({
  codes,
  onMoveStage,
}: {
  codes: string[];
  onMoveStage: (code: string, stage: LeadStage) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <ArrowRightLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          Move to stage
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{codes.length} selected</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LEAD_STAGES.map(({ value }) => (
          <DropdownMenuItem key={value} onSelect={() => codes.forEach((code) => onMoveStage(code, value))}>
            {leadStageLabel(value)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LeadsTable({ data, loading, onMoveStage }: LeadsTableProps) {
  return (
    <DataTable
      columns={[
        {
          accessorKey: "company",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Company" />,
          cell: ({ row }) => {
            const lead = row.original;
            return (
              <div className="flex flex-col">
                <Link
                  href={`/sales/leads/${lead.code}`}
                  className="font-medium text-foreground hover:text-primary hover:underline"
                >
                  {lead.company}
                </Link>
                <span className="text-xs tabular-nums text-muted-foreground">{lead.code}</span>
              </div>
            );
          },
        },
        {
          accessorKey: "contactName",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Contact" />,
          cell: ({ row }) => {
            const lead = row.original;
            return (
              <div className="flex flex-col">
                <span className="text-foreground">{lead.contactName}</span>
                <span className="text-xs text-muted-foreground">{lead.contactEmail}</span>
              </div>
            );
          },
        },
        {
          accessorKey: "stage",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Stage" />,
          cell: ({ row }) => <LeadStageBadge stage={row.original.stage} />,
        },
        {
          accessorKey: "value",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Value" />,
          cell: ({ row }) => (
            <span className="font-medium tabular-nums text-foreground">
              {formatCurrency(row.original.value, row.original.currency)}
            </span>
          ),
        },
        {
          accessorKey: "probability",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Probability" />,
          cell: ({ row }) => (
            <span className="tabular-nums text-muted-foreground">{row.original.probability}%</span>
          ),
        },
        {
          accessorKey: "expectedClose",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Expected close" />,
          cell: ({ row }) => (
            <span className="tabular-nums text-muted-foreground">
              {formatLeadDate(row.original.expectedClose)}
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
      searchable
      globalSearchPlaceholder="Search leads…"
      enableRowSelection
      getRowId={(lead) => (lead as Lead).code}
      initialSorting={[{ id: "value", desc: true }]}
      bulkActions={(selected) => (
        <StageMoveMenu
          codes={selected.map((lead) => (lead as Lead).code)}
          onMoveStage={onMoveStage}
        />
      )}
      emptyState={{
        title: "No leads yet",
        description: "Create your first lead to start building your pipeline.",
      }}
      noResultsState={{
        title: "No matching leads",
        description: "Try adjusting your search or clear the filters.",
      }}
    />
  );
}
