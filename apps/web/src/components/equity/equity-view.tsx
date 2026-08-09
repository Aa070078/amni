"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Coins, Layers, Loader2, Users } from "lucide-react";
import { useState } from "react";
import type { LegacyColumnDef } from "@tanstack/react-table/legacy";
import type { CapTableRow, Round, ShareClass, Shareholder } from "@amni/shared";
import {
  Button,
  Card,
  CardContent,
  DataTable,
  DataTableColumnHeader,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@amni/ui";
import { formatCurrency, formatNumber } from "@/src/lib/format";
import { equityClient } from "@/src/lib/equity";
import { PanelEmpty, PanelError } from "@/src/components/dashboard/panel-utils";
import { NewShareholderDialog } from "./new-shareholder-dialog";
import { NewShareClassDialog } from "./new-share-class-dialog";
import { NewRoundDialog } from "./new-round-dialog";
import { RoundStatusBadge, RoundTypeBadge, ShareClassStatusBadge, ShareholderTypeBadge } from "./equity-status";

const CURRENCY = "USD";

const CAP_TABLE_COLUMNS: LegacyColumnDef<CapTableRow>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Shareholder" />,
    cell: ({ row }) => (
      <Link
        href={`/finance/equity/shareholders/${row.original.shareholderCode}`}
        className="font-medium text-foreground hover:text-primary hover:underline"
      >
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: "type",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
    cell: ({ row }) => <ShareholderTypeBadge type={row.original.type} />,
  },
  {
    accessorKey: "className",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Class" />,
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.className}</span>,
  },
  {
    accessorKey: "shares",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Shares" />,
    cell: ({ row }) => (
      <span className="font-medium tabular-nums text-foreground">{formatNumber(row.original.shares)}</span>
    ),
  },
  {
    accessorKey: "ownershipPct",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Ownership" />,
    cell: ({ row }) => (
      <span className="tabular-nums text-muted-foreground">{row.original.ownershipPct.toFixed(2)}%</span>
    ),
  },
  {
    accessorKey: "investedAmount",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Invested" />,
    cell: ({ row }) => (
      <span className="font-medium tabular-nums text-foreground">{formatCurrency(row.original.investedAmount, CURRENCY)}</span>
    ),
  },
];

const SHAREHOLDER_COLUMNS: LegacyColumnDef<Shareholder>[] = [
  {
    accessorKey: "code",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Shareholder" />,
    cell: ({ row }) => (
      <Link
        href={`/finance/equity/shareholders/${row.original.code}`}
        className="font-medium tabular-nums text-foreground hover:text-primary hover:underline"
      >
        {row.original.code}
      </Link>
    ),
  },
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => <span className="text-foreground">{row.original.name}</span>,
  },
  {
    accessorKey: "type",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
    cell: ({ row }) => <ShareholderTypeBadge type={row.original.type} />,
  },
  {
    accessorKey: "totalShares",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Shares" />,
    cell: ({ row }) => <span className="tabular-nums text-muted-foreground">{formatNumber(row.original.totalShares)}</span>,
  },
  {
    accessorKey: "investedAmount",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Invested" />,
    cell: ({ row }) => (
      <span className="font-medium tabular-nums text-foreground">
        {formatCurrency(row.original.investedAmount, CURRENCY)}
      </span>
    ),
  },
  {
    accessorKey: "joinedAt",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Joined" />,
    cell: ({ row }) => (
      <span className="tabular-nums text-muted-foreground">
        {row.original.joinedAt ? new Date(row.original.joinedAt).toLocaleDateString() : "—"}
      </span>
    ),
  },
];

const CLASS_COLUMNS: LegacyColumnDef<ShareClass>[] = [
  {
    accessorKey: "code",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Class" />,
    cell: ({ row }) => (
      <Link
        href={`/finance/equity/classes/${row.original.code}`}
        className="font-medium tabular-nums text-foreground hover:text-primary hover:underline"
      >
        {row.original.code}
      </Link>
    ),
  },
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => <span className="text-foreground">{row.original.name}</span>,
  },
  {
    accessorKey: "totalShares",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Total" />,
    cell: ({ row }) => <span className="tabular-nums text-muted-foreground">{formatNumber(row.original.totalShares)}</span>,
  },
  {
    accessorKey: "outstandingShares",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Outstanding" />,
    cell: ({ row }) => <span className="tabular-nums text-muted-foreground">{formatNumber(row.original.outstandingShares)}</span>,
  },
  {
    accessorKey: "pricePerShare",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Price / share" />,
    cell: ({ row }) => (
      <span className="tabular-nums text-muted-foreground">{formatCurrency(row.original.pricePerShare, CURRENCY)}</span>
    ),
  },
  {
    accessorKey: "voting",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Voting" />,
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.voting ? "Voting" : "Non-voting"}</span>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => <ShareClassStatusBadge status={row.original.status} />,
  },
];

const ROUND_COLUMNS: LegacyColumnDef<Round>[] = [
  {
    accessorKey: "code",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Round" />,
    cell: ({ row }) => (
      <Link
        href={`/finance/equity/rounds/${row.original.code}`}
        className="font-medium tabular-nums text-foreground hover:text-primary hover:underline"
      >
        {row.original.code}
      </Link>
    ),
  },
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => <span className="text-foreground">{row.original.name}</span>,
  },
  {
    accessorKey: "type",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
    cell: ({ row }) => <RoundTypeBadge type={row.original.type} />,
  },
  {
    accessorKey: "amountRaised",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Raised" />,
    cell: ({ row }) => (
      <span className="font-medium tabular-nums text-foreground">{formatCurrency(row.original.amountRaised, CURRENCY)}</span>
    ),
  },
  {
    accessorKey: "postMoney",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Post-money" />,
    cell: ({ row }) => (
      <span className="tabular-nums text-muted-foreground">{formatCurrency(row.original.postMoney, CURRENCY)}</span>
    ),
  },
  {
    accessorKey: "announcedDate",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Announced" />,
    cell: ({ row }) => (
      <span className="tabular-nums text-muted-foreground">{new Date(row.original.announcedDate).toLocaleDateString()}</span>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => <RoundStatusBadge status={row.original.status} />,
  },
];

export function EquityView() {
  const queryClient = useQueryClient();
  const [created, setCreated] = useState<{ code: string; label: string } | null>(null);

  const overviewQuery = useQuery({
    queryKey: ["equity", "overview"],
    queryFn: () => equityClient.overview(),
  });

  const capTableQuery = useQuery({
    queryKey: ["equity", "cap-table"],
    queryFn: () => equityClient.capTable(),
    placeholderData: (previous) => previous,
  });

  const shareholdersQuery = useQuery({
    queryKey: ["equity", "shareholders"],
    queryFn: () => equityClient.listShareholders({ page: 1, pageSize: 100, sortBy: "name", sortDir: "asc" }),
    placeholderData: (previous) => previous,
  });

  const classesQuery = useQuery({
    queryKey: ["equity", "classes"],
    queryFn: () => equityClient.listClasses({ page: 1, pageSize: 100, sortBy: "name", sortDir: "asc" }),
    placeholderData: (previous) => previous,
  });

  const roundsQuery = useQuery({
    queryKey: ["equity", "rounds"],
    queryFn: () => equityClient.listRounds({ page: 1, pageSize: 100, sortBy: "announcedDate", sortDir: "desc" }),
    placeholderData: (previous) => previous,
  });

  const closeRound = useMutation({
    mutationFn: (code: string) => equityClient.changeRoundStatus(code, "closed"),
    onSuccess: (round) => {
      void queryClient.invalidateQueries({ queryKey: ["equity", "rounds"] });
      void queryClient.invalidateQueries({ queryKey: ["equity", "overview"] });
      setCreated({ code: round.code, label: `Closed ${round.code}` });
    },
  });

  const archiveClass = useMutation({
    mutationFn: (code: string) => equityClient.changeClassStatus(code, "archived"),
    onSuccess: (shareClass) => {
      void queryClient.invalidateQueries({ queryKey: ["equity", "classes"] });
      void queryClient.invalidateQueries({ queryKey: ["equity", "overview"] });
      setCreated({ code: shareClass.code, label: `Archived ${shareClass.code}` });
    },
  });

  const removeShareholder = useMutation({
    mutationFn: (code: string) => equityClient.removeShareholder(code),
    onSuccess: (_, code) => {
      void queryClient.invalidateQueries({ queryKey: ["equity", "shareholders"] });
      void queryClient.invalidateQueries({ queryKey: ["equity", "cap-table"] });
      void queryClient.invalidateQueries({ queryKey: ["equity", "overview"] });
      setCreated({ code, label: `Removed ${code}` });
    },
  });

  const capTable = capTableQuery.data;
  const shareholders = shareholdersQuery.data;
  const classes = classesQuery.data;
  const rounds = roundsQuery.data;

  const loading = capTableQuery.isLoading || shareholdersQuery.isLoading || classesQuery.isLoading || roundsQuery.isLoading;

  const onCreated = (code: string, label: string) => {
    void queryClient.invalidateQueries({ queryKey: ["equity", "overview"] });
    void queryClient.invalidateQueries({ queryKey: ["equity", "cap-table"] });
    void queryClient.invalidateQueries({ queryKey: ["equity", "shareholders"] });
    void queryClient.invalidateQueries({ queryKey: ["equity", "classes"] });
    void queryClient.invalidateQueries({ queryKey: ["equity", "rounds"] });
    setCreated({ code, label: `${label} ${code}` });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Equity</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cap table, shareholders, share classes, and funding rounds.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NewRoundDialog onCreated={(round) => onCreated(round.code, "Created")} />
          <NewShareholderDialog onCreated={(shareholder) => onCreated(shareholder.code, "Created")} />
          <NewShareClassDialog onCreated={(shareClass) => onCreated(shareClass.code, "Created")} />
        </div>
      </div>

      {created ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{created.label}</span>
        </div>
      ) : null}

      {overviewQuery.isError || capTableQuery.isError || shareholdersQuery.isError || classesQuery.isError || roundsQuery.isError ? (
        <Card>
          <CardContent className="p-6">
            <PanelError
              onRetry={() => {
                void overviewQuery.refetch();
                void capTableQuery.refetch();
                void shareholdersQuery.refetch();
                void classesQuery.refetch();
                void roundsQuery.refetch();
              }}
            />
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <div className="space-y-3 rounded-md border p-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-8" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {overviewQuery.data ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Total shares</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight">
                    {formatNumber(overviewQuery.data.totalShares)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Total invested</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight">
                    {formatCurrency(overviewQuery.data.totalInvested, CURRENCY)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Valuation</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight">
                    {formatCurrency(overviewQuery.data.currentValuation, CURRENCY)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Investors</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight">
                    {overviewQuery.data.investorCount}
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : null}

          <Tabs defaultValue="cap-table">
            <TabsList aria-label="Equity sections">
              <TabsTrigger value="cap-table">Cap table</TabsTrigger>
              <TabsTrigger value="shareholders">Shareholders</TabsTrigger>
              <TabsTrigger value="classes">Share classes</TabsTrigger>
              <TabsTrigger value="rounds">Rounds</TabsTrigger>
            </TabsList>

            <TabsContent value="cap-table" className="space-y-4">
              {!capTable || capTable.length === 0 ? (
                <Card>
                  <CardContent className="p-6">
                    <PanelEmpty
                      icon={Users}
                      title="No shareholders yet"
                      description="Add shareholders and their holdings to see the cap table."
                    />
                  </CardContent>
                </Card>
              ) : (
                <DataTable
                  columns={CAP_TABLE_COLUMNS}
                  data={capTable}
                  searchable
                  globalSearchPlaceholder="Search cap table…"
                  getRowId={(row) => `${row.shareholderCode}-${row.classCode}`}
                  emptyState={{
                    icon: <Users className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
                    title: "No cap table rows",
                    description: "Add shareholders to populate the cap table.",
                  }}
                  noResultsState={{
                    icon: <Users className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
                    title: "No matching rows",
                    description: "Try adjusting your search.",
                  }}
                />
              )}
            </TabsContent>

            <TabsContent value="shareholders" className="space-y-4">
              {!shareholders || shareholders.items.length === 0 ? (
                <Card>
                  <CardContent className="p-6">
                    <PanelEmpty
                      icon={Users}
                      title="No shareholders yet"
                      description="Founders, investors, and employees will appear here."
                    />
                  </CardContent>
                </Card>
              ) : (
                <DataTable
                  columns={SHAREHOLDER_COLUMNS}
                  data={shareholders.items}
                  searchable
                  globalSearchPlaceholder="Search shareholders…"
                  getRowId={(shareholder) => (shareholder as Shareholder).code}
                  bulkActions={(rows) => (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={removeShareholder.isPending}
                      onClick={() => {
                        if (!window.confirm(`Remove ${rows.length} shareholder${rows.length === 1 ? "" : "s"}?`)) return;
                        for (const shareholder of rows) removeShareholder.mutate(shareholder.code);
                      }}
                    >
                      Remove
                    </Button>
                  )}
                  emptyState={{
                    icon: <Users className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
                    title: "No shareholders",
                    description: "Add a shareholder to get started.",
                  }}
                  noResultsState={{
                    icon: <Users className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
                    title: "No matching shareholders",
                    description: "Try adjusting your search.",
                  }}
                />
              )}
            </TabsContent>

            <TabsContent value="classes" className="space-y-4">
              {!classes || classes.items.length === 0 ? (
                <Card>
                  <CardContent className="p-6">
                    <PanelEmpty
                      icon={Layers}
                      title="No share classes yet"
                      description="Common stock, preferred, and other classes will appear here."
                    />
                  </CardContent>
                </Card>
              ) : (
                <DataTable
                  columns={CLASS_COLUMNS}
                  data={classes.items}
                  searchable
                  globalSearchPlaceholder="Search classes…"
                  getRowId={(shareClass) => (shareClass as ShareClass).code}
                  bulkActions={(rows) => (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={archiveClass.isPending}
                      onClick={() => {
                        for (const shareClass of rows) archiveClass.mutate(shareClass.code);
                      }}
                    >
                      Archive
                    </Button>
                  )}
                  emptyState={{
                    icon: <Layers className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
                    title: "No share classes",
                    description: "Create a class to organize shares.",
                  }}
                  noResultsState={{
                    icon: <Layers className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
                    title: "No matching classes",
                    description: "Try adjusting your search.",
                  }}
                />
              )}
            </TabsContent>

            <TabsContent value="rounds" className="space-y-4">
              {!rounds || rounds.items.length === 0 ? (
                <Card>
                  <CardContent className="p-6">
                    <PanelEmpty
                      icon={Coins}
                      title="No funding rounds yet"
                      description="Track raises and valuations here."
                    />
                  </CardContent>
                </Card>
              ) : (
                <DataTable
                  columns={ROUND_COLUMNS}
                  data={rounds.items}
                  searchable
                  globalSearchPlaceholder="Search rounds…"
                  getRowId={(round) => (round as Round).code}
                  bulkActions={(rows) => (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={closeRound.isPending}
                      onClick={() => {
                        for (const round of rows) {
                          if (round.status !== "closed") closeRound.mutate(round.code);
                        }
                      }}
                    >
                      <Loader2 className={`mr-1 h-3.5 w-3.5 ${closeRound.isPending ? "animate-spin" : ""}`} aria-hidden="true" />
                      Close
                    </Button>
                  )}
                  emptyState={{
                    icon: <Coins className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
                    title: "No rounds",
                    description: "Record your first funding round.",
                  }}
                  noResultsState={{
                    icon: <Coins className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
                    title: "No matching rounds",
                    description: "Try adjusting your search.",
                  }}
                />
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
