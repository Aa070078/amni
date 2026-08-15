"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Check, Loader2, MessageCircle, Phone, Plus, StickyNote } from "lucide-react";
import {
  CRM_TASK_PRIORITIES,
  type CrmReferenceType,
} from "@amni/shared";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@amni/ui";
import { cn } from "@amni/ui";
import { crmClient, formatCrmDateOnly } from "@/src/lib/crm";
import {
  CrmCallStatusBadge,
  CrmTaskPriorityBadge,
  CrmTaskStatusBadge,
} from "./crm-badges";
import { LogCallDialog } from "./call-logs/log-call-dialog";
import { SendWhatsAppDialog } from "./whatsapp/send-whatsapp-dialog";

function PanelError({ onRetry }: { onRetry: () => void }) {
  return (
    <p className="text-sm text-muted-foreground">
      Couldn&apos;t load.{" "}
      <button className="text-primary underline" onClick={onRetry}>
        Retry
      </button>
    </p>
  );
}

function EmptyLine({ children }: { children: string }) {
  return <p className="rounded-md border border-dashed px-3 py-3 text-center text-sm text-muted-foreground">{children}</p>;
}

export function RecordTasksPanel({
  referenceType,
  referenceCode,
}: {
  referenceType: CrmReferenceType;
  referenceCode: string;
}) {
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const queryKey = ["crm", "tasks", "for", referenceType, referenceCode] as const;

  const tasksQuery = useQuery({
    queryKey,
    queryFn: () => crmClient.tasks.list({ referenceType, referenceCode, pageSize: 20 }),
  });

  const createTask = useMutation({
    mutationFn: () =>
      crmClient.tasks.create({ subject, priority, status: "backlog", referenceType, referenceCode }),
    onSuccess: () => {
      setSubject("");
      void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({ queryKey: ["crm", "tasks", "board"] });
    },
  });

  const toggleDone = useMutation({
    mutationFn: ({ code, status }: { code: string; status: "done" | "backlog" }) =>
      crmClient.tasks.updateStatus(code, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({ queryKey: ["crm", "tasks", "board"] });
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          Tasks
          <span className="text-xs font-normal text-muted-foreground">
            {tasksQuery.data?.meta.total ?? "…"} open items
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            if (subject.trim()) createTask.mutate();
          }}
          noValidate
        >
          <Input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="New task…"
            aria-label="New task subject"
            className="flex-1"
          />
          <Select value={priority} onValueChange={(value) => setPriority(value as typeof priority)}>
            <SelectTrigger className="w-full sm:w-32" aria-label="Task priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CRM_TASK_PRIORITIES.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" size="sm" disabled={createTask.isPending || !subject.trim()}>
            {createTask.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="mr-2 h-4 w-4" aria-hidden="true" />}
            Add
          </Button>
        </form>

        {tasksQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-10 rounded-md" />
            ))}
          </div>
        ) : tasksQuery.isError ? (
          <PanelError onRetry={() => void tasksQuery.refetch()} />
        ) : (tasksQuery.data?.items.length ?? 0) === 0 ? (
          <EmptyLine>No tasks linked to this record.</EmptyLine>
        ) : (
          <ul className="divide-y">
            {(tasksQuery.data?.items ?? []).map((task) => (
              <li key={task.code} className="flex items-start gap-3 py-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "mt-0.5 h-5 w-5 shrink-0 rounded-full border",
                    task.status === "done" && "border-success bg-success/10 text-success",
                  )}
                  aria-label={task.status === "done" ? "Reopen task" : "Mark task done"}
                  onClick={() =>
                    toggleDone.mutate({
                      code: task.code,
                      status: task.status === "done" ? "backlog" : "done",
                    })
                  }
                >
                  <Check className="h-3 w-3" aria-hidden="true" />
                </Button>
                <div className="min-w-0 flex-1">
                  <Link href={`/sales/crm/tasks/${task.code}`} className="text-sm font-medium hover:underline">
                    {task.subject}
                  </Link>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="tabular-nums">{task.code}</span>
                    {task.dueDate ? <span>due {formatCrmDateOnly(task.dueDate)}</span> : null}
                    <CrmTaskPriorityBadge priority={task.priority} />
                  </div>
                </div>
                <CrmTaskStatusBadge status={task.status} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function RecordNotesPanel({
  referenceType,
  referenceCode,
}: {
  referenceType: CrmReferenceType;
  referenceCode: string;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const queryKey = ["crm", "notes", "for", referenceType, referenceCode] as const;

  const notesQuery = useQuery({
    queryKey,
    queryFn: () => crmClient.notes.list({ referenceType, referenceCode, pageSize: 20 }),
  });

  const createNote = useMutation({
    mutationFn: () => crmClient.notes.create({ title, content, referenceType, referenceCode }),
    onSuccess: () => {
      setTitle("");
      setContent("");
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <StickyNote className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (title.trim()) createNote.mutate();
          }}
          noValidate
        >
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Note title…"
            aria-label="Note title"
          />
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={2}
            placeholder="Add details…"
            aria-label="Note content"
            className="flex min-h-[48px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button type="submit" size="sm" disabled={createNote.isPending || !title.trim()}>
            {createNote.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="mr-2 h-4 w-4" aria-hidden="true" />}
            Add note
          </Button>
        </form>

        {notesQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <Skeleton key={index} className="h-16 rounded-md" />
            ))}
          </div>
        ) : notesQuery.isError ? (
          <PanelError onRetry={() => void notesQuery.refetch()} />
        ) : (notesQuery.data?.items.length ?? 0) === 0 ? (
          <EmptyLine>No notes for this record.</EmptyLine>
        ) : (
          <ul className="divide-y">
            {(notesQuery.data?.items ?? []).map((note) => (
              <li key={note.code} className="py-2">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/sales/crm/notes/${note.code}`} className="text-sm font-medium hover:underline">
                    {note.title}
                  </Link>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{note.code}</span>
                </div>
                {note.content ? (
                  <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground">{note.content}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function RecordEventsPanel({
  referenceType,
  referenceCode,
}: {
  referenceType: CrmReferenceType;
  referenceCode: string;
}) {
  const eventsQuery = useQuery({
    queryKey: ["crm", "events", "for", referenceType, referenceCode],
    queryFn: () => crmClient.events.list({ referenceType, referenceCode }),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Events
        </CardTitle>
      </CardHeader>
      <CardContent>
        {eventsQuery.isLoading ? (
          <Skeleton className="h-16 rounded-md" />
        ) : eventsQuery.isError ? (
          <PanelError onRetry={() => void eventsQuery.refetch()} />
        ) : (eventsQuery.data?.items.length ?? 0) === 0 ? (
          <EmptyLine>No events scheduled for this record.</EmptyLine>
        ) : (
          <ul className="divide-y">
            {(eventsQuery.data?.items ?? []).map((eventItem) => (
              <li key={eventItem.id} className="flex items-start justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{eventItem.title}</p>
                  <p className="text-xs text-muted-foreground">{formatCrmDateOnly(eventItem.startsAt)}</p>
                </div>
                <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-xs capitalize text-muted-foreground">
                  {eventItem.type.replace(/_/g, " ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function RecordCallsPanel({
  referenceType,
  referenceCode,
}: {
  referenceType: CrmReferenceType;
  referenceCode: string;
}) {
  const queryClient = useQueryClient();
  const [logOpen, setLogOpen] = useState(false);
  const queryKey = ["crm", "call-logs", "for", referenceType, referenceCode] as const;

  const callsQuery = useQuery({
    queryKey,
    queryFn: () => crmClient.callLogs.list({ referenceType, referenceCode, pageSize: 20 }),
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Phone className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Calls
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => setLogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Log call
        </Button>
      </CardHeader>
      <CardContent>
        {callsQuery.isLoading ? (
          <Skeleton className="h-16 rounded-md" />
        ) : callsQuery.isError ? (
          <PanelError onRetry={() => void callsQuery.refetch()} />
        ) : (callsQuery.data?.items.length ?? 0) === 0 ? (
          <EmptyLine>No calls logged for this record.</EmptyLine>
        ) : (
          <ul className="divide-y">
            {(callsQuery.data?.items ?? []).map((call) => (
              <li key={call.id} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium capitalize">{call.direction} call</p>
                  <p className="text-xs text-muted-foreground">
                    {call.phoneNumber} · {formatCrmDateOnly(call.startTime)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {call.durationSeconds !== undefined && call.durationSeconds !== null ? `${call.durationSeconds}s` : ""}
                  </span>
                  <CrmCallStatusBadge status={call.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <LogCallDialog
        open={logOpen}
        onOpenChange={setLogOpen}
        defaultReference={{ type: referenceType, code: referenceCode }}
        onLogged={() => void queryClient.invalidateQueries({ queryKey })}
      />
    </Card>
  );
}

export function RecordWhatsAppPanel({
  referenceType,
  referenceCode,
}: {
  referenceType: CrmReferenceType;
  referenceCode: string;
}) {
  const queryClient = useQueryClient();
  const [sendOpen, setSendOpen] = useState(false);
  const queryKey = ["crm", "whatsapp", "for", referenceType, referenceCode] as const;

  const historyQuery = useQuery({
    queryKey,
    queryFn: () => crmClient.whatsapp.history({ referenceType, referenceCode, limit: 20 }),
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          WhatsApp
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => setSendOpen(true)}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Send message
        </Button>
      </CardHeader>
      <CardContent>
        {historyQuery.isLoading ? (
          <Skeleton className="h-16 rounded-md" />
        ) : historyQuery.isError ? (
          <PanelError onRetry={() => void historyQuery.refetch()} />
        ) : (historyQuery.data?.items.length ?? 0) === 0 ? (
          <EmptyLine>No WhatsApp messages for this record.</EmptyLine>
        ) : (
          <ul className="space-y-3">
            {(historyQuery.data?.items ?? []).map((message) => (
              <li key={message.id} className="rounded-md bg-muted/40 px-3 py-2">
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="tabular-nums">To {message.to}</span>
                  <span className="capitalize">{message.status}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm">{message.message}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <SendWhatsAppDialog
        open={sendOpen}
        onOpenChange={setSendOpen}
        defaultReference={{ type: referenceType, code: referenceCode }}
        onSent={() => void queryClient.invalidateQueries({ queryKey })}
      />
    </Card>
  );
}
