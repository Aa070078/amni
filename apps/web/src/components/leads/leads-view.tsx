"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, LayoutGrid, List, Search, TrendingUp, Users } from "lucide-react";
import {
  LEAD_STAGE_PROBABILITY,
  LEAD_STAGES,
  type Lead,
  type LeadStage,
  type LeadStageStat,
} from "@amni/shared";
import { Button, Card, CardContent, Skeleton } from "@amni/ui";
import { formatCurrency } from "@/src/lib/format";
import { leadsClient } from "@/src/lib/leads";
import { LeadsBoard } from "./leads-board";
import { LeadsTable } from "./leads-table";
import { NewLeadDialog } from "./new-lead-dialog";

const OPEN_STAGES: LeadStage[] = ["new", "contacted", "qualified", "proposal"];

function recomputeStats(items: Lead[]): LeadStageStat[] {
  return LEAD_STAGES.map(({ value, label }) => {
    const stageLeads = items.filter((lead) => lead.stage === value);
    return {
      stage: value,
      label,
      count: stageLeads.length,
      value: stageLeads.reduce((sum, lead) => sum + lead.value, 0),
    };
  });
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-xl font-semibold tabular-nums tracking-tight">{value}</span>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </CardContent>
    </Card>
  );
}

function BoardSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden" aria-hidden>
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="w-[272px] shrink-0 space-y-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function LeadsView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [view, setView] = useState<"board" | "list">("board");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createdLead, setCreatedLead] = useState<Lead | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!createdLead) return;
    const timer = setTimeout(() => setCreatedLead(null), 5000);
    return () => clearTimeout(timer);
  }, [createdLead]);

  const pipelineQuery = useQuery({
    queryKey: ["leads", "pipeline", debouncedSearch],
    queryFn: () => leadsClient.pipeline(debouncedSearch.trim() || undefined),
    placeholderData: (previous) => previous,
  });

  const moveStage = useMutation({
    mutationFn: ({ code, stage }: { code: string; stage: LeadStage }) =>
      leadsClient.moveStage(code, { stage }),
    onMutate: async ({ code, stage }) => {
      await queryClient.cancelQueries({ queryKey: ["leads", "pipeline", debouncedSearch] });
      const previous = queryClient.getQueryData<{ stats: LeadStageStat[]; items: Lead[] }>([
        "leads",
        "pipeline",
        debouncedSearch,
      ]);
      if (previous) {
        const items = previous.items.map((lead) =>
          lead.code === code
            ? { ...lead, stage, probability: LEAD_STAGE_PROBABILITY[stage], updatedAt: new Date().toISOString() }
            : lead,
        );
        queryClient.setQueryData(["leads", "pipeline", debouncedSearch], {
          items,
          stats: recomputeStats(items),
        });
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["leads", "pipeline", debouncedSearch], context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["leads", "pipeline", debouncedSearch] });
    },
  });

  const createLead = useMutation({
    mutationFn: leadsClient.create,
    onSuccess: (lead) => {
      setCreatedLead(lead);
      void queryClient.invalidateQueries({ queryKey: ["leads", "pipeline"] });
    },
  });

  const data = pipelineQuery.data;

  const openPipelineValue = data
    ? data.stats.filter((stat) => OPEN_STAGES.includes(stat.stage)).reduce((sum, stat) => sum + stat.value, 0)
    : 0;
  const openCount = data
    ? data.stats.filter((stat) => OPEN_STAGES.includes(stat.stage)).reduce((sum, stat) => sum + stat.count, 0)
    : 0;
  const wonStat = data?.stats.find((stat) => stat.stage === "won");
  const lostStat = data?.stats.find((stat) => stat.stage === "lost");
  const closedCount = (wonStat?.count ?? 0) + (lostStat?.count ?? 0);
  const winRate = closedCount > 0 ? Math.round(((wonStat?.count ?? 0) / closedCount) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track and move opportunities through your sales pipeline.
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <NewLeadDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            onCreate={(lead) => createLead.mutate(lead)}
          />
        </div>
      </div>

      {createdLead ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Created{" "}
            <Link href={`/sales/leads/${createdLead.code}`} className="font-semibold underline underline-offset-2">
              {createdLead.code}
            </Link>{" "}
            for {createdLead.company}.
          </span>
        </div>
      ) : null}

      {pipelineQuery.isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <TrendingUp className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-base font-semibold">Couldn&apos;t load your pipeline</p>
              <p className="text-sm text-muted-foreground">
                Something went wrong fetching your leads. Please try again.
              </p>
            </div>
            <Button variant="outline" onClick={() => void pipelineQuery.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : pipelineQuery.isLoading || !data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-20 rounded-lg" />
            ))}
          </div>
          <BoardSkeleton />
        </div>
      ) : data.items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <Users className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-base font-semibold">No leads yet</p>
              <p className="text-sm text-muted-foreground">
                Create your first lead to start building your pipeline.
              </p>
            </div>
            <Button onClick={() => setDialogOpen(true)}>New lead</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard
              label="Open pipeline"
              value={formatCurrency(openPipelineValue, "USD")}
              hint={`${openCount} open opportunities`}
            />
            <StatCard
              label="Won value"
              value={formatCurrency(wonStat?.value ?? 0, "USD")}
              hint={`${wonStat?.count ?? 0} won`}
            />
            <StatCard
              label="Win rate"
              value={`${winRate}%`}
              hint={`${lostStat?.count ?? 0} lost`}
            />
            <StatCard
              label="Pipeline leads"
              value={`${data.items.length}`}
              hint="Across all stages"
            />
          </div>

          <div className="relative">
            <Search
              className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search leads…"
              aria-label="Search leads"
              className="h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-sm"
            />
          </div>

          {view === "board" ? (
            <LeadsBoard
              leads={data.items}
              stats={data.stats}
              onMoveStage={(code, stage) => moveStage.mutate({ code, stage })}
            />
          ) : (
            <LeadsTable
              data={data.items}
              onMoveStage={(code, stage) => moveStage.mutate({ code, stage })}
            />
          )}
        </>
      )}
    </div>
  );
}
