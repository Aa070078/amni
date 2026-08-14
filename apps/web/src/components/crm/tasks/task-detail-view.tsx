"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, CalendarClock, CheckSquare, User } from "lucide-react";
import { CRM_TASK_STATUSES, type CrmTaskStatus } from "@amni/shared";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton } from "@amni/ui";
import { AmniApiError } from "@/src/lib/client";
import { crmClient, formatCrmDateOnly, formatCrmDateTime } from "@/src/lib/crm";
import { ActivityTimeline } from "../activity-timeline";
import { RecordNotesPanel, RecordEventsPanel, RecordCallsPanel, RecordWhatsAppPanel } from "../record-panels";
import { CrmReferenceChip, CrmTaskPriorityBadge, CrmTaskStatusBadge } from "../crm-badges";

interface TaskDetailViewProps {
  code: string;
}

export function TaskDetailView({ code }: TaskDetailViewProps) {
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ["crm", "tasks", "detail", code],
    queryFn: () => crmClient.tasks.detail(code),
    retry: (failureCount, error) => {
      if (error instanceof AmniApiError && error.status === 404) return false;
      return failureCount < 2;
    },
  });

  const updateStatus = useMutation({
    mutationFn: (status: CrmTaskStatus) => crmClient.tasks.updateStatus(code, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["crm", "tasks", "detail", code] });
      void queryClient.invalidateQueries({ queryKey: ["crm", "tasks", "board"] });
      void queryClient.invalidateQueries({ queryKey: ["crm", "tasks", "list"] });
    },
  });

  if (detailQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-32 rounded-lg" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-48 rounded-lg lg:col-span-2" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </div>
    );
  }

  if (detailQuery.isError) {
    const is404 = detailQuery.error instanceof AmniApiError && detailQuery.error.status === 404;
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
          <CheckSquare className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-base font-semibold">
              {is404 ? "Task not found" : "Couldn&apos;t load this task"}
            </p>
            <p className="text-sm text-muted-foreground">
              {is404 ? `No task matches ${code}. It may have been removed.` : "Something went wrong. Please try again."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!is404 ? (
              <Button variant="outline" onClick={() => void detailQuery.refetch()}>
                Retry
              </Button>
            ) : null}
            <Button asChild variant={is404 ? "default" : "outline"}>
              <Link href="/sales/crm/tasks">
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Back to tasks
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const task = detailQuery.data;
  if (!task) return null;

  return (
    <div className="space-y-6">
      <Link
        href="/sales/crm/tasks"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Tasks
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{task.subject}</h1>
              <span className="text-sm tabular-nums text-muted-foreground">{task.code}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <CrmTaskStatusBadge status={task.status} />
              <CrmTaskPriorityBadge priority={task.priority} />
              {task.assignedTo ? (
                <span className="inline-flex items-center gap-1.5">
                  <User className="h-4 w-4" aria-hidden="true" />
                  {task.assignedTo}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
            <Select value={task.status} onValueChange={(value) => updateStatus.mutate(value as CrmTaskStatus)}>
              <SelectTrigger className="w-full sm:w-44" aria-label="Change status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CRM_TASK_STATUSES.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">Updated {formatCrmDateTime(task.updatedAt)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
              <CardDescription>Task information.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <DetailRow icon={CalendarClock} label="Due date" value={formatCrmDateOnly(task.dueDate)} />
              <DetailRow icon={User} label="Assigned to" value={task.assignedTo ?? "—"} />
              <DetailRow
                icon={CheckSquare}
                label="Created"
                value={formatCrmDateTime(task.createdAt)}
              />
              {task.completedAt ? (
                <DetailRow icon={CheckSquare} label="Completed" value={formatCrmDateTime(task.completedAt)} />
              ) : null}
              {task.referenceType && task.referenceCode ? (
                <div className="flex items-start gap-2.5">
                  <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">Related to</p>
                    <CrmReferenceChip referenceType={task.referenceType} referenceCode={task.referenceCode} />
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {task.description ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{task.description}</p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTimeline referenceType="task" referenceCode={code} />
            </CardContent>
          </Card>

          <RecordNotesPanel referenceType="task" referenceCode={code} />
          <RecordEventsPanel referenceType="task" referenceCode={code} />
          <RecordCallsPanel referenceType="task" referenceCode={code} />
          <RecordWhatsAppPanel referenceType="task" referenceCode={code} />
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: typeof CheckSquare; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="truncate text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
}
