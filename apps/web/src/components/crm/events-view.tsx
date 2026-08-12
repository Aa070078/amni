"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Clock } from "lucide-react";
import { CRM_EVENT_TYPES, type CrmEvent, type CrmEventType } from "@amni/shared";
import { Button, Card, CardContent, Skeleton } from "@amni/ui";
import { crmClient, formatCrmDateTime } from "@/src/lib/crm";
import { CrmReferenceChip } from "./crm-badges";
import { CrmSectionHeader } from "./crm-nav";
import { NewEventDialog } from "./events/new-event-dialog";

export function EventsView() {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<CrmEventType | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const eventsQuery = useQuery({
    queryKey: ["crm", "events", { type: typeFilter }],
    queryFn: () => crmClient.events.list({ type: typeFilter === "all" ? undefined : typeFilter }),
    placeholderData: (previous) => previous,
  });

  const items = eventsQuery.data?.items ?? [];

  return (
    <div className="space-y-6">
      <CrmSectionHeader title="Events" description="Calls, meetings, and follow-ups across the team.">
        <NewEventDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onCreate={() => void queryClient.invalidateQueries({ queryKey: ["crm", "events"] })}
        />
      </CrmSectionHeader>

      <div className="flex flex-wrap gap-2">
        <TypeFilterButton active={typeFilter === "all"} onClick={() => setTypeFilter("all")}>
          All
        </TypeFilterButton>
        {CRM_EVENT_TYPES.map(({ value, label }) => (
          <TypeFilterButton key={value} active={typeFilter === value} onClick={() => setTypeFilter(value)}>
            {label}
          </TypeFilterButton>
        ))}
      </div>

      {eventsQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : eventsQuery.isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <CalendarDays className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-base font-semibold">Couldn&apos;t load events</p>
              <p className="text-sm text-muted-foreground">Something went wrong. Please try again.</p>
            </div>
            <Button variant="outline" onClick={() => void eventsQuery.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <CalendarDays className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-base font-semibold">No events yet</p>
              <p className="text-sm text-muted-foreground">Schedule your first call, meeting, or follow-up.</p>
            </div>
            <Button onClick={() => setDialogOpen(true)}>New event</Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {items.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TypeFilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant={active ? "default" : "outline"}
      size="sm"
      onClick={onClick}
      aria-pressed={active}
    >
      {children}
    </Button>
  );
}

function EventRow({ event }: { event: CrmEvent }) {
  return (
    <li className="rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium text-foreground">{event.title}</h3>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {CRM_EVENT_TYPES.find(({ value }) => value === event.type)?.label ?? event.type}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4" aria-hidden="true" />
              {formatCrmDateTime(event.startsAt)}
              {event.endsAt ? ` – ${formatCrmDateTime(event.endsAt)}` : ""}
            </span>
            {event.reminderBeforeMinutes != null ? (
              <span>Reminder {event.reminderBeforeMinutes} min before</span>
            ) : null}
            {event.referenceType && event.referenceCode ? (
              <CrmReferenceChip referenceType={event.referenceType} referenceCode={event.referenceCode} />
            ) : null}
          </div>
          {event.description ? (
            <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-sm text-muted-foreground">{event.description}</p>
          ) : null}
        </div>
      </div>
    </li>
  );
}
