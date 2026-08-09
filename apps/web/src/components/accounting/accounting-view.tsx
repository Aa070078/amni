"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { BookOpen, CheckCircle2, Loader2, NotebookPen, Scale } from "lucide-react";
import { useState } from "react";
import type { LegacyColumnDef } from "@tanstack/react-table/legacy";
import type { Account, JournalEntry } from "@amni/shared";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataTable,
  DataTableColumnHeader,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@amni/ui";
import { formatCurrency, formatRelativeTime } from "@/src/lib/format";
import { accountingClient } from "@/src/lib/accounting";
import { PanelEmpty, PanelError } from "@/src/components/dashboard/panel-utils";
import { AccountTypeBadge, JournalEntryStatusBadge } from "./accounting-status";

const CURRENCY = "USD";

const ACCOUNT_COLUMNS: LegacyColumnDef<Account>[] = [
  {
    accessorKey: "code",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Account" />,
    cell: ({ row }) => (
      <Link
        href={`/finance/accounting/accounts/${row.original.code}`}
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
    cell: ({ row }) => <AccountTypeBadge type={row.original.type} />,
  },
  {
    accessorKey: "group",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Group" />,
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.group}</span>,
  },
  {
    accessorKey: "balance",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Balance" />,
    cell: ({ row }) => (
      <span className="font-medium tabular-nums text-foreground">
        {formatCurrency(row.original.balance, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => (
      <Badge variant={row.original.status === "active" ? "success" : "outline"}>{row.original.status}</Badge>
    ),
  },
];

const JOURNAL_COLUMNS: LegacyColumnDef<JournalEntry>[] = [
  {
    accessorKey: "code",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Entry" />,
    cell: ({ row }) => (
      <Link
        href={`/finance/accounting/journal-entries/${row.original.code}`}
        className="font-medium tabular-nums text-foreground hover:text-primary hover:underline"
      >
        {row.original.code}
      </Link>
    ),
  },
  {
    accessorKey: "date",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
    cell: ({ row }) => (
      <span className="tabular-nums text-muted-foreground">{new Date(row.original.date).toLocaleDateString()}</span>
    ),
  },
  {
    accessorKey: "memo",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Memo" />,
    cell: ({ row }) => <span className="max-w-md truncate text-foreground">{row.original.memo}</span>,
  },
  {
    accessorKey: "referenceCode",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Reference" />,
    cell: ({ row }) => (
      <span className="tabular-nums text-muted-foreground">
        {row.original.referenceCode ? `${row.original.referenceType ?? ""} ${row.original.referenceCode}`.trim() : "—"}
      </span>
    ),
  },
  {
    accessorKey: "entries",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Lines" />,
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.entries.length}</span>,
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => <JournalEntryStatusBadge status={row.original.status} />,
  },
];

export function AccountingView() {
  const queryClient = useQueryClient();
  const [posted, setPosted] = useState<string | null>(null);

  const overviewQuery = useQuery({
    queryKey: ["accounting", "overview"],
    queryFn: () => accountingClient.overview(),
  });

  const accountsQuery = useQuery({
    queryKey: ["accounting", "accounts"],
    queryFn: () => accountingClient.listAccounts({ page: 1, pageSize: 100, sortBy: "code", sortDir: "asc" }),
    placeholderData: (previous) => previous,
  });

  const journalQuery = useQuery({
    queryKey: ["accounting", "journal"],
    queryFn: () => accountingClient.listJournalEntries({ page: 1, pageSize: 100, sortBy: "date", sortDir: "desc" }),
    placeholderData: (previous) => previous,
  });

  const trialBalanceQuery = useQuery({
    queryKey: ["accounting", "trial-balance"],
    queryFn: () => accountingClient.trialBalance(),
    placeholderData: (previous) => previous,
  });

  const postEntry = useMutation({
    mutationFn: (code: string) => accountingClient.changeJournalEntryStatus(code, "posted"),
    onSuccess: (entry) => {
      void queryClient.invalidateQueries({ queryKey: ["accounting", "journal"] });
      void queryClient.invalidateQueries({ queryKey: ["accounting", "trial-balance"] });
      void queryClient.invalidateQueries({ queryKey: ["accounting", "overview"] });
      setPosted(entry.code);
    },
  });

  const accounts = accountsQuery.data;
  const journal = journalQuery.data;
  const trialBalance = trialBalanceQuery.data;

  const loading = accountsQuery.isLoading || journalQuery.isLoading || trialBalanceQuery.isLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Accounting</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Chart of accounts, journal entries, and the trial balance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/finance/invoicing">Invoicing</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/finance">Overview</Link>
          </Button>
        </div>
      </div>

      {posted ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Posted {posted}</span>
        </div>
      ) : null}

      {overviewQuery.isError || accountsQuery.isError || journalQuery.isError || trialBalanceQuery.isError ? (
        <Card>
          <CardContent className="p-6">
            <PanelError
              onRetry={() => {
                void overviewQuery.refetch();
                void accountsQuery.refetch();
                void journalQuery.refetch();
                void trialBalanceQuery.refetch();
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
          {overviewQuery.data && overviewQuery.data.kpis.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {overviewQuery.data.kpis.map((kpi) => (
                <Card key={kpi.id}>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight">
                      {kpi.format === "currency"
                        ? formatCurrency(kpi.value, kpi.currency ?? CURRENCY)
                        : new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(kpi.value)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}

          <Tabs defaultValue="accounts">
            <TabsList aria-label="Accounting sections">
              <TabsTrigger value="accounts">Chart of accounts</TabsTrigger>
              <TabsTrigger value="journal">Journal entries</TabsTrigger>
              <TabsTrigger value="trial-balance">Trial balance</TabsTrigger>
            </TabsList>

            <TabsContent value="accounts" className="space-y-4">
              {!accounts || accounts.items.length === 0 ? (
                <Card>
                  <CardContent className="p-6">
                    <PanelEmpty
                      icon={BookOpen}
                      title="No accounts yet"
                      description="Your chart of accounts will show here."
                    />
                  </CardContent>
                </Card>
              ) : (
                <DataTable
                  columns={ACCOUNT_COLUMNS}
                  data={accounts.items}
                  searchable
                  globalSearchPlaceholder="Search accounts…"
                  getRowId={(account) => (account as Account).code}
                  emptyState={{
                    icon: <BookOpen className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
                    title: "No accounts",
                    description: "Create an account to build your chart of accounts.",
                  }}
                  noResultsState={{
                    icon: <BookOpen className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
                    title: "No matching accounts",
                    description: "Try adjusting your search.",
                  }}
                />
              )}
            </TabsContent>

            <TabsContent value="journal" className="space-y-4">
              {!journal || journal.items.length === 0 ? (
                <Card>
                  <CardContent className="p-6">
                    <PanelEmpty
                      icon={NotebookPen}
                      title="No journal entries yet"
                      description="Journal entries will show here."
                    />
                  </CardContent>
                </Card>
              ) : (
                <DataTable
                  columns={JOURNAL_COLUMNS}
                  data={journal.items}
                  searchable
                  globalSearchPlaceholder="Search journal entries…"
                  getRowId={(entry) => (entry as JournalEntry).code}
                  bulkActions={(rows) => (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={postEntry.isPending}
                      onClick={() => {
                        for (const entry of rows) {
                          if (entry.status === "draft") postEntry.mutate(entry.code);
                        }
                      }}
                    >
                      <Loader2 className={`mr-1 h-3.5 w-3.5 ${postEntry.isPending ? "animate-spin" : ""}`} aria-hidden="true" />
                      Post
                    </Button>
                  )}
                  emptyState={{
                    icon: <NotebookPen className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
                    title: "No journal entries",
                    description: "Create a journal entry to get started.",
                  }}
                  noResultsState={{
                    icon: <NotebookPen className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
                    title: "No matching entries",
                    description: "Try adjusting your search.",
                  }}
                />
              )}
            </TabsContent>

            <TabsContent value="trial-balance" className="space-y-4">
              {!trialBalance || trialBalance.rows.length === 0 ? (
                <Card>
                  <CardContent className="p-6">
                    <PanelEmpty
                      icon={Scale}
                      title="No trial balance yet"
                      description="Run journal entries to populate the trial balance."
                    />
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Scale className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      Trial balance
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Generated {formatRelativeTime(trialBalance.generatedAt)}
                    </p>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Account</TableHead>
                          <TableHead className="w-32 text-right">Debit</TableHead>
                          <TableHead className="w-32 text-right">Credit</TableHead>
                          <TableHead className="w-32 text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trialBalance.rows.map((row) => (
                          <TableRow key={row.accountCode}>
                            <TableCell>
                              <span className="tabular-nums text-muted-foreground">{row.accountCode}</span>{" "}
                              <span className="text-foreground">{row.name}</span>
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {row.debit !== 0 ? formatCurrency(row.debit, CURRENCY) : "—"}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {row.credit !== 0 ? formatCurrency(row.credit, CURRENCY) : "—"}
                            </TableCell>
                            <TableCell className="text-right font-medium tabular-nums text-foreground">
                              {formatCurrency(row.balance, CURRENCY)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter>
                        <TableRow>
                          <TableCell className="font-medium text-foreground">Total</TableCell>
                          <TableCell className="text-right font-semibold tabular-nums text-foreground">
                            {formatCurrency(trialBalance.totalDebit, CURRENCY)}
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums text-foreground">
                            {formatCurrency(trialBalance.totalCredit, CURRENCY)}
                          </TableCell>
                          <TableCell />
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
