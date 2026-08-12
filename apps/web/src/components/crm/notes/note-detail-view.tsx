"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, CalendarClock, Pin, StickyNote } from "lucide-react";
import { Button, Card, CardContent, CardHeader, Skeleton } from "@amni/ui";
import { AmniApiError } from "@/src/lib/client";
import { crmClient, formatCrmDateTime } from "@/src/lib/crm";
import { CrmReferenceChip } from "../crm-badges";
import { ActivityTimeline } from "../activity-timeline";
import { RecordTasksPanel, RecordEventsPanel, RecordCallsPanel, RecordWhatsAppPanel } from "../record-panels";

interface NoteDetailViewProps {
  code: string;
}

export function NoteDetailView({ code }: NoteDetailViewProps) {
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ["crm", "notes", "detail", code],
    queryFn: () => crmClient.notes.detail(code),
    retry: (failureCount, error) => {
      if (error instanceof AmniApiError && error.status === 404) return false;
      return failureCount < 2;
    },
  });

  const togglePin = useMutation({
    mutationFn: () => crmClient.notes.update(code, { pinned: !detailQuery.data?.pinned }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["crm", "notes"] }),
  });

  if (detailQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
    );
  }

  if (detailQuery.isError) {
    const is404 = detailQuery.error instanceof AmniApiError && detailQuery.error.status === 404;
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
          <StickyNote className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-base font-semibold">{is404 ? "Note not found" : "Couldn&apos;t load this note"}</p>
            <p className="text-sm text-muted-foreground">
              {is404 ? `No note matches ${code}. It may have been removed.` : "Something went wrong. Please try again."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!is404 ? (
              <Button variant="outline" onClick={() => void detailQuery.refetch()}>
                Retry
              </Button>
            ) : null}
            <Button asChild variant={is404 ? "default" : "outline"}>
              <Link href="/sales/crm/notes">
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Back to notes
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const note = detailQuery.data;
  if (!note) return null;

  return (
    <div className="space-y-6">
      <Link
        href="/sales/crm/notes"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Notes
      </Link>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight">{note.title}</h1>
                {note.pinned ? <Pin className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> : null}
                <span className="text-sm tabular-nums text-muted-foreground">{note.code}</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {note.author ? <span>{note.author}</span> : null}
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock className="h-4 w-4" aria-hidden="true" />
                  {formatCrmDateTime(note.createdAt)}
                </span>
                {note.referenceType && note.referenceCode ? (
                  <CrmReferenceChip referenceType={note.referenceType} referenceCode={note.referenceCode} />
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => togglePin.mutate()}
                disabled={togglePin.isPending}
              >
                <Pin className="mr-2 h-4 w-4" aria-hidden="true" />
                {note.pinned ? "Unpin" : "Pin"}
              </Button>
            </div>
          </div>

          {note.content ? (
            <div className="mt-5 border-t pt-5">
              <p className="whitespace-pre-wrap text-sm text-foreground">{note.content}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <h2 className="text-base font-semibold">Activity</h2>
            </CardHeader>
            <CardContent>
              <ActivityTimeline referenceType="note" referenceCode={code} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <RecordTasksPanel referenceType="note" referenceCode={code} />
          <RecordEventsPanel referenceType="note" referenceCode={code} />
          <RecordCallsPanel referenceType="note" referenceCode={code} />
          <RecordWhatsAppPanel referenceType="note" referenceCode={code} />
        </div>
      </div>
    </div>
  );
}
