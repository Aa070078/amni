"use client";

import Link from "next/link";
import { ArrowRightLeft } from "lucide-react";
import { DEAL_STAGES, type Deal, type DealStage } from "@amni/shared";
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
import { formatDealDate } from "@/src/lib/deals";
import { DealStageBadge, dealStageLabel } from "./deal-stage";

interface DealsTableProps {
  data: Deal[];
  loading?: boolean;
  onMoveStage: (code: string, stage: DealStage) => void;
}

function StageMoveMenu({
  codes,
  onMoveStage,
}: {
  codes: string[];
  onMoveStage: (code: string, stage: DealStage) => void;
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
        {DEAL_STAGES.map(({ value }) => (
          <DropdownMenuItem key={value} onSelect={() => codes.forEach((code) => onMoveStage(code, value))}>
            {dealStageLabel(value)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DealsTable({ data, loading, onMoveStage }: DealsTableProps) {
  return (
    <DataTable
      columns={[
        {
          accessorKey: "title",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Deal" />,
          cell: ({ row }) => {
            const deal = row.original;
            return (
              <div className="flex flex-col">
                <Link
                  href={`/sales/deals/${deal.code}`}
                  className="font-medium text-foreground hover:text-primary hover:underline"
                >
                  {deal.title}
                </Link>
                <span className="text-xs tabular-nums text-muted-foreground">{deal.code}</span>
              </div>
            );
          },
        },
        {
          accessorKey: "company",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Company" />,
          cell: ({ row }) => <span className="text-foreground">{row.original.company}</span>,
        },
        {
          accessorKey: "contactName",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Contact" />,
          cell: ({ row }) => {
            const deal = row.original;
            return (
              <div className="flex flex-col">
                <span className="text-foreground">{deal.contactName}</span>
                <span className="text-xs text-muted-foreground">{deal.contactEmail}</span>
              </div>
            );
          },
        },
        {
          accessorKey: "stage",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Stage" />,
          cell: ({ row }) => <DealStageBadge stage={row.original.stage} />,
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
              {formatDealDate(row.original.expectedClose)}
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
      globalSearchPlaceholder="Search deals…"
      enableRowSelection
      getRowId={(deal) => (deal as Deal).code}
      initialSorting={[{ id: "value", desc: true }]}
      bulkActions={(selected) => (
        <StageMoveMenu
          codes={selected.map((deal) => (deal as Deal).code)}
          onMoveStage={onMoveStage}
        />
      )}
      emptyState={{
        title: "No deals yet",
        description: "Create your first deal to start building your pipeline.",
      }}
      noResultsState={{
        title: "No matching deals",
        description: "Try adjusting your search or clear the filters.",
      }}
    />
  );
}
