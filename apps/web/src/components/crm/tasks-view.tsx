"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckSquare, LayoutGrid, List } from "lucide-react";
import type { CrmTaskStatus } from "@amni/shared";
import { Button, Card, CardContent, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton } from "@amni/ui";
import { crmClient } from "@/src/lib/crm";
import { CrmSectionHeader } from "./crm-nav";
import { TasksBoard } from "./tasks/tasks-board";
import { TasksTable } from "./tasks/tasks-table";
import { NewTaskDialog } from "./tasks/new-task-dialog";

export function TasksView() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<"board" | "list">("board");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<CrmTaskStatus | "">("");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const hasFilters = debouncedSearch.trim().length > 0 || status !== "";

  const boardQuery = useQuery({
    queryKey: ["crm", "tasks", "board"],
    queryFn: () => crmClient.tasks.board(),
    placeholderData: (previous) => previous,
    enabled: view === "board" && !hasFilters,
  });

  const listQuery = useQuery({
    queryKey: ["crm", "tasks", "list", { q: debouncedSearch, status }],
    queryFn: () =>
      crmClient.tasks.list({
        q: debouncedSearch.trim() || undefined,
        status: status || undefined,
      }),
    placeholderData: (previous) => previous,
  });

  const moveStatus = useMutation({
    mutationFn: ({ code, status: next }: { code: string; status: CrmTaskStatus }) =>
      crmClient.tasks.updateStatus(code, next),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["crm", "tasks", "board"] });
      void queryClient.invalidateQueries({ queryKey: ["crm", "tasks", "list"] });
    },
  });

  const activeBoard = boardQuery.data;
  const listItems = listQuery.data?.items ?? [];
  const isLoading = view === "board" && !hasFilters ? boardQuery.isLoading : listQuery.isLoading;
  const isError = view === "board" && !hasFilters ? boardQuery.isError : listQuery.isError;

  return (
    <div className="space-y-6">
      <CrmSectionHeader
        title="Tasks"
        description="Plan work and follow-ups across the team."
      >
        <NewTaskDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onCreate={() => {
            void queryClient.invalidateQueries({ queryKey: ["crm", "tasks", "board"] });
            void queryClient.invalidateQueries({ queryKey: ["crm", "tasks", "list"] });
          }}
        />
      </CrmSectionHeader>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          role="group"
          aria-label="View mode"
          className="inline-flex items-center rounded-md border bg-muted/50 p-0.5"
        >
          <Button
            variant={view === "board" ? "default" : "ghost"}
            size="sm"
            className="h-7 gap-1.5 px-2.5"
            onClick={() => setView("board")}
            aria-pressed={view === "board"}
          >
            <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
            Board
          </Button>
          <Button
            variant={view === "list" ? "default" : "ghost"}
            size="sm"
            className="h-7 gap-1.5 px-2.5"
            onClick={() => setView("list")}
            aria-pressed={view === "list"}
          >
            <List className="h-3.5 w-3.5" aria-hidden="true" />
            List
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tasks…"
            aria-label="Search tasks"
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-56"
          />
          <Select value={status} onValueChange={(value) => setStatus(value as CrmTaskStatus | "")}>
            <SelectTrigger className="h-9 w-36" aria-label="Filter by status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              <SelectItem value="backlog">Backlog</SelectItem>
              <SelectItem value="working">Working</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="done">Done</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-80 rounded-lg" />
      ) : isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <CheckSquare className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-base font-semibold">Couldn&apos;t load tasks</p>
              <p className="text-sm text-muted-foreground">Something went wrong. Please try again.</p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                if (view === "board" && !hasFilters) void boardQuery.refetch();
                else void listQuery.refetch();
              }}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : view === "board" && !hasFilters && activeBoard ? (
        <TasksBoard
          columns={activeBoard.columns}
          onMoveStatus={(code, next) => moveStatus.mutate({ code, status: next })}
        />
      ) : (
        <TasksTable
          data={listItems}
          loading={listQuery.isFetching}
          onMoveStatus={(code, next) => moveStatus.mutate({ code, status: next })}
        />
      )}
    </div>
  );
}
