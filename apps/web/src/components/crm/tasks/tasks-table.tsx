"use client";

import Link from "next/link";
import { ArrowRightLeft } from "lucide-react";
import { CRM_TASK_STATUSES, type CrmTask, type CrmTaskStatus } from "@amni/shared";
import {
  Button,
  DataTable,
  DataTableColumnHeader,
  DataTableFacetedFilter,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@amni/ui";
import { formatCrmDateOnly } from "@/src/lib/crm";
import { CrmReferenceChip, CrmTaskPriorityBadge, CrmTaskStatusBadge, crmTaskStatusLabel } from "../crm-badges";

interface TasksTableProps {
  data: CrmTask[];
  loading?: boolean;
  onMoveStatus: (code: string, status: CrmTaskStatus) => void;
}

function StatusMoveMenu({ codes, onMoveStatus }: { codes: string[]; onMoveStatus: TasksTableProps["onMoveStatus"] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <ArrowRightLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          Move to status
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{codes.length} selected</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {CRM_TASK_STATUSES.map(({ value }) => (
          <DropdownMenuItem key={value} onSelect={() => codes.forEach((code) => onMoveStatus(code, value))}>
            {crmTaskStatusLabel(value)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TasksTable({ data, loading, onMoveStatus }: TasksTableProps) {
  return (
    <DataTable
      columns={[
        {
          accessorKey: "subject",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Task" />,
          cell: ({ row }) => {
            const task = row.original;
            return (
              <div className="flex flex-col">
                <Link
                  href={`/sales/crm/tasks/${task.code}`}
                  className="font-medium text-foreground hover:text-primary hover:underline"
                >
                  {task.subject}
                </Link>
                <span className="text-xs tabular-nums text-muted-foreground">{task.code}</span>
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
                options={CRM_TASK_STATUSES.map(({ value, label }) => ({ label, value }))}
              />
            </DataTableColumnHeader>
          ),
          cell: ({ row }) => <CrmTaskStatusBadge status={row.original.status} />,
        },
        {
          accessorKey: "priority",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Priority">
              <DataTableFacetedFilter
                column={column}
                title="Priority"
                options={[
                  { label: "Low", value: "low" },
                  { label: "Medium", value: "medium" },
                  { label: "High", value: "high" },
                  { label: "Urgent", value: "urgent" },
                ]}
              />
            </DataTableColumnHeader>
          ),
          cell: ({ row }) => <CrmTaskPriorityBadge priority={row.original.priority} />,
        },
        {
          accessorKey: "dueDate",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Due" />,
          cell: ({ row }) => (
            <span className="tabular-nums text-muted-foreground">{formatCrmDateOnly(row.original.dueDate)}</span>
          ),
        },
        {
          accessorKey: "assignedTo",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Assignee" />,
          cell: ({ row }) => <span className="text-muted-foreground">{row.original.assignedTo ?? "—"}</span>,
        },
        {
          id: "reference",
          header: "Related to",
          cell: ({ row }) => (
            <CrmReferenceChip referenceType={row.original.referenceType} referenceCode={row.original.referenceCode} />
          ),
        },
      ]}
      data={data}
      loading={loading}
      searchable
      globalSearchPlaceholder="Search tasks…"
      enableRowSelection
      getRowId={(task) => (task as CrmTask).code}
      initialSorting={[{ id: "dueDate", desc: false }]}
      bulkActions={(selected) => (
        <StatusMoveMenu
          codes={selected.map((task) => (task as CrmTask).code)}
          onMoveStatus={onMoveStatus}
        />
      )}
      emptyState={{
        title: "No tasks yet",
        description: "Create your first task to stay on top of follow-ups.",
      }}
      noResultsState={{
        title: "No matching tasks",
        description: "Try adjusting your search or clear the filters.",
      }}
    />
  );
}
