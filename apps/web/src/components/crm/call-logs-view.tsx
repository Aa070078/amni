"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PhoneCall, PhoneMissed } from "lucide-react";
import type { CrmCallDirection, CrmCallStatus } from "@amni/shared";
import { Button, Card, CardContent, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton } from "@amni/ui";
import { crmClient } from "@/src/lib/crm";
import { formatCallDuration } from "./crm-badges";
import { CrmSectionHeader } from "./crm-nav";
import { CallLogsTable } from "./call-logs/call-logs-table";
import { LogCallDialog } from "./call-logs/log-call-dialog";

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
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

export function CallLogsView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [direction, setDirection] = useState<CrmCallDirection | "">("");
  const [status, setStatus] = useState<CrmCallStatus | "">("");
  const [logOpen, setLogOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const callsQuery = useQuery({
    queryKey: ["crm", "call-logs", { q: debouncedSearch, direction, status }],
    queryFn: () =>
      crmClient.callLogs.list({
        q: debouncedSearch.trim() || undefined,
        direction: direction || undefined,
        status: status || undefined,
      }),
    placeholderData: (previous) => previous,
  });

  const summary = callsQuery.data?.summary;
  const items = callsQuery.data?.items ?? [];

  return (
    <div className="space-y-6">
      <CrmSectionHeader
        title="Call logs"
        description="Track inbound and outbound calls across the team."
      >
        <Button onClick={() => setLogOpen(true)}>
          <PhoneCall className="mr-2 h-4 w-4" aria-hidden="true" />
          Log call
        </Button>
      </CrmSectionHeader>

      {callsQuery.isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : callsQuery.isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <PhoneMissed className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-base font-semibold">Couldn&apos;t load call logs</p>
              <p className="text-sm text-muted-foreground">Something went wrong. Please try again.</p>
            </div>
            <Button variant="outline" onClick={() => void callsQuery.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Total calls" value={String(summary?.total ?? 0)} />
            <StatCard label="Completed" value={String(summary?.completed ?? 0)} />
            <StatCard label="Missed" value={String(summary?.missed ?? 0)} />
            <StatCard
              label="Talk time"
              value={formatCallDuration(summary?.totalDurationSeconds ?? 0)}
              hint={`${summary?.incoming ?? 0} in · ${summary?.outgoing ?? 0} out`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:max-w-sm">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search calls…"
                aria-label="Search calls"
                className="h-9 w-full rounded-md border border-input bg-transparent pl-3 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <Select value={direction} onValueChange={(value) => setDirection(value as CrmCallDirection | "")}>
              <SelectTrigger className="h-9 w-36" aria-label="Filter by direction">
                <SelectValue placeholder="All directions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All directions</SelectItem>
                <SelectItem value="inbound">Inbound</SelectItem>
                <SelectItem value="outbound">Outbound</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(value) => setStatus(value as CrmCallStatus | "")}>
              <SelectTrigger className="h-9 w-36" aria-label="Filter by status">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="missed">Missed</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="busy">Busy</SelectItem>
                <SelectItem value="ringing">Ringing</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <CallLogsTable data={items} loading={callsQuery.isFetching} />
        </>
      )}

      <LogCallDialog
        open={logOpen}
        onOpenChange={setLogOpen}
        onLogged={() => void queryClient.invalidateQueries({ queryKey: ["crm", "call-logs"] })}
      />
    </div>
  );
}
