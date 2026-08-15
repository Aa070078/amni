"use client";

import { useState, type DragEvent } from "react";
import Link from "next/link";
import { CheckSquare } from "lucide-react";
import { CRM_TASK_STATUSES, type CrmTask, type CrmTaskStatus } from "@amni/shared";
import { cn } from "@amni/ui";
import { formatCrmDateOnly } from "@/src/lib/crm";
import { CrmReferenceChip, CrmTaskPriorityBadge, CrmTaskStatusBadge, crmTaskStatusLabel } from "../crm-badges";

interface TasksBoardProps {
  columns: { status: CrmTaskStatus; count: number; items: CrmTask[] }[];
  onMoveStatus: (code: string, status: CrmTaskStatus) => void;
}

export function TasksBoard({ columns, onMoveStatus }: TasksBoardProps) {
  const [dragCode, setDragCode] = useState<string | null>(null);
  const [overStatus, setOverStatus] = useState<CrmTaskStatus | null>(null);

  function handleDrop(status: CrmTaskStatus, event: DragEvent<HTMLElement>) {
    event.preventDefault();
    const code = dragCode ?? event.dataTransfer.getData("text/plain");
    setDragCode(null);
    setOverStatus(null);
    if (code) onMoveStatus(code, status);
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2" role="region" aria-label="Tasks board">
      {CRM_TASK_STATUSES.map(({ value }) => {
        const column = columns.find((entry) => entry.status === value);
        const items = column?.items ?? [];
        return (
          <section
            key={value}
            aria-label={`${crmTaskStatusLabel(value)} tasks`}
            onDragOver={(event) => {
              event.preventDefault();
              setOverStatus(value);
            }}
            onDragLeave={() => setOverStatus((current) => (current === value ? null : current))}
            onDrop={(event) => handleDrop(value, event)}
            className={cn(
              "flex min-h-[320px] w-[272px] shrink-0 flex-col rounded-xl border bg-muted/30 p-2 transition-colors",
              overStatus === value && "border-primary bg-muted/60",
            )}
          >
            <header className="flex items-center justify-between gap-2 px-1.5 py-2">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-foreground">{crmTaskStatusLabel(value)}</h3>
                <span
                  className="rounded-full bg-muted-foreground/10 px-2 py-0.5 text-xs tabular-nums text-muted-foreground"
                  aria-label={`${items.length} tasks`}
                >
                  {items.length}
                </span>
              </div>
            </header>

            <div className="flex flex-col gap-2">
              {items.map((task) => (
                <article
                  key={task.code}
                  draggable
                  onDragStart={(event) => {
                    setDragCode(task.code);
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", task.code);
                  }}
                  onDragEnd={() => {
                    setDragCode(null);
                    setOverStatus(null);
                  }}
                  className={cn(
                    "cursor-grab rounded-lg border bg-card p-3 shadow-sm transition-opacity active:cursor-grabbing",
                    dragCode === task.code && "opacity-40",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/sales/crm/tasks/${task.code}`}
                      className="text-sm font-medium leading-snug text-foreground hover:text-primary hover:underline"
                    >
                      {task.subject}
                    </Link>
                    <CrmTaskStatusBadge status={task.status} className="shrink-0" />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="tabular-nums">{task.code}</span>
                    <CrmTaskPriorityBadge priority={task.priority} />
                    {task.dueDate ? <span>due {formatCrmDateOnly(task.dueDate)}</span> : null}
                    {task.assignedTo ? <span>{task.assignedTo}</span> : null}
                  </div>
                  {task.referenceType && task.referenceCode ? (
                    <div className="mt-2">
                      <CrmReferenceChip referenceType={task.referenceType} referenceCode={task.referenceCode} />
                    </div>
                  ) : null}
                </article>
              ))}
              {items.length === 0 && (
                <p className="rounded-md border border-dashed px-2 py-4 text-center text-xs text-muted-foreground">
                  No tasks
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
