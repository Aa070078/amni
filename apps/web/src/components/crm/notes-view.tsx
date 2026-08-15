"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pin, StickyNote } from "lucide-react";
import type { CrmNote } from "@amni/shared";
import { Button, Card, CardContent, Skeleton } from "@amni/ui";
import { crmClient, formatCrmDateTime } from "@/src/lib/crm";
import { CrmReferenceChip } from "./crm-badges";
import { CrmSectionHeader } from "./crm-nav";
import { NewNoteDialog } from "./notes/new-note-dialog";

export function NotesView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const notesQuery = useQuery({
    queryKey: ["crm", "notes", { q: debouncedSearch }],
    queryFn: () => crmClient.notes.list({ q: debouncedSearch.trim() || undefined }),
    placeholderData: (previous) => previous,
  });

  const items = notesQuery.data?.items ?? [];
  const pinned = items.filter((note) => note.pinned);
  const unpinned = items.filter((note) => !note.pinned);

  return (
    <div className="space-y-6">
      <CrmSectionHeader title="Notes" description="Capture context and attach notes to CRM records.">
        <NewNoteDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onCreate={() => void queryClient.invalidateQueries({ queryKey: ["crm", "notes"] })}
        />
      </CrmSectionHeader>

      <div className="relative sm:max-w-sm">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search notes…"
          aria-label="Search notes"
          className="h-9 w-full rounded-md border border-input bg-transparent pl-3 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {notesQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-40 rounded-lg" />
          ))}
        </div>
      ) : notesQuery.isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <StickyNote className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-base font-semibold">Couldn&apos;t load notes</p>
              <p className="text-sm text-muted-foreground">Something went wrong. Please try again.</p>
            </div>
            <Button variant="outline" onClick={() => void notesQuery.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <StickyNote className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-base font-semibold">No notes yet</p>
              <p className="text-sm text-muted-foreground">Write your first note to capture important context.</p>
            </div>
            <Button onClick={() => setDialogOpen(true)}>New note</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {pinned.length > 0 ? (
            <NoteSection title="Pinned" notes={pinned} />
          ) : null}
          <NoteSection title="All notes" notes={unpinned} />
        </div>
      )}
    </div>
  );
}

function NoteSection({ title, notes }: { title: string; notes: CrmNote[] }) {
  if (notes.length === 0) return null;
  return (
    <div className="space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {title === "Pinned" ? <Pin className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> : null}
        {title}
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
          {notes.length}
        </span>
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {notes.map((note) => (
          <li key={note.code} className="flex flex-col rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <Link href={`/sales/crm/notes/${note.code}`} className="font-medium text-foreground hover:text-primary hover:underline">
                {note.title}
              </Link>
              {note.pinned ? <Pin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" /> : null}
            </div>
            {note.content ? (
              <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm text-muted-foreground">{note.content}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
              <span className="tabular-nums">{note.code}</span>
              <span>{formatCrmDateTime(note.createdAt)}</span>
            </div>
            {note.referenceType && note.referenceCode ? (
              <div className="mt-2">
                <CrmReferenceChip referenceType={note.referenceType} referenceCode={note.referenceCode} />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
