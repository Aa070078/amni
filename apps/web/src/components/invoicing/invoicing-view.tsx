"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, FileMinus, Loader2, Repeat } from "lucide-react";
import { useState } from "react";
import type { LegacyColumnDef } from "@tanstack/react-table/legacy";
import type { CreditNote, RecurringProfile } from "@amni/shared";
import {
  Badge,
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
import { formatCurrency } from "@/src/lib/format";
import { invoicingClient } from "@/src/lib/invoicing";
import { PanelEmpty, PanelError } from "@/src/components/dashboard/panel-utils";
import { CreditNoteStatusBadge } from "./credit-note-status";
import { RecurringStatusBadge } from "./recurring-status";

const CURRENCY = "USD";

const CREDIT_NOTE_COLUMNS: LegacyColumnDef<CreditNote>[] = [
  {
    accessorKey: "code",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Credit note" />,
    cell: ({ row }) => (
      <Link
        href={`/finance/invoicing/credit-notes/${row.original.code}`}
        className="font-medium tabular-nums text-foreground hover:text-primary hover:underline"
      >
        {row.original.code}
      </Link>
    ),
  },
  {
    accessorKey: "invoiceCode",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Invoice" />,
    cell: ({ row }) => <span className="tabular-nums text-muted-foreground">{row.original.invoiceCode}</span>,
  },
  {
    accessorKey: "customer.name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Customer" />,
    cell: ({ row }) => <span className="text-foreground">{row.original.customer.name}</span>,
  },
  {
    accessorKey: "date",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
    cell: ({ row }) => (
      <span className="tabular-nums text-muted-foreground">{new Date(row.original.date).toLocaleDateString()}</span>
    ),
  },
  {
    accessorKey: "summary.total",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
    cell: ({ row }) => (
      <span className="font-medium tabular-nums text-foreground">
        {formatCurrency(row.original.summary.total, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => <CreditNoteStatusBadge status={row.original.status} />,
  },
];

const RECURRING_COLUMNS: LegacyColumnDef<RecurringProfile>[] = [
  {
    accessorKey: "code",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Profile" />,
    cell: ({ row }) => (
      <Link
        href={`/finance/invoicing/recurring/${row.original.code}`}
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
    accessorKey: "customer.name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Customer" />,
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.customer.name}</span>,
  },
  {
    accessorKey: "interval",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Interval" />,
    cell: ({ row }) => (
      <Badge variant="secondary">
        {row.original.interval} · day {row.original.dayOfPeriod}
      </Badge>
    ),
  },
  {
    accessorKey: "summary.total",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
    cell: ({ row }) => (
      <span className="font-medium tabular-nums text-foreground">
        {formatCurrency(row.original.summary.total, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: "nextRun",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Next run" />,
    cell: ({ row }) => (
      <span className="tabular-nums text-muted-foreground">{new Date(row.original.nextRun).toLocaleDateString()}</span>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => <RecurringStatusBadge status={row.original.status} />,
  },
];

export function InvoicingView() {
  const queryClient = useQueryClient();
  const [created, setCreated] = useState<{ code: string; label: string } | null>(null);

  const overviewQuery = useQuery({
    queryKey: ["invoicing", "overview"],
    queryFn: () => invoicingClient.overview(),
  });

  const creditNotesQuery = useQuery({
    queryKey: ["invoicing", "credit-notes"],
    queryFn: () => invoicingClient.listCreditNotes({ page: 1, pageSize: 100, sortBy: "date", sortDir: "desc" }),
    placeholderData: (previous) => previous,
  });

  const recurringQuery = useQuery({
    queryKey: ["invoicing", "recurring"],
    queryFn: () => invoicingClient.listRecurring({ page: 1, pageSize: 100, sortBy: "nextRun", sortDir: "asc" }),
    placeholderData: (previous) => previous,
  });

  const pauseRecurring = useMutation({
    mutationFn: (code: string) => invoicingClient.changeRecurringStatus(code, "paused"),
    onSuccess: (profile) => {
      void queryClient.invalidateQueries({ queryKey: ["invoicing", "recurring"] });
      void queryClient.invalidateQueries({ queryKey: ["invoicing", "overview"] });
      setCreated({ code: profile.code, label: `Paused ${profile.code}` });
    },
  });

  const resumeRecurring = useMutation({
    mutationFn: (code: string) => invoicingClient.changeRecurringStatus(code, "active"),
    onSuccess: (profile) => {
      void queryClient.invalidateQueries({ queryKey: ["invoicing", "recurring"] });
      void queryClient.invalidateQueries({ queryKey: ["invoicing", "overview"] });
      setCreated({ code: profile.code, label: `Resumed ${profile.code}` });
    },
  });

  const creditNotes = creditNotesQuery.data;
  const recurring = recurringQuery.data;

  const loading = creditNotesQuery.isLoading || recurringQuery.isLoading;

  return (
    <div className="space-y-6">
      <Link
        href="/finance"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Finance
      </Link>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoicing</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Credit notes, recurring billing, and payables across your workspace.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/finance/accounting">Accounting</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/finance">Overview</Link>
          </Button>
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

      {overviewQuery.isError || creditNotesQuery.isError || recurringQuery.isError ? (
        <Card>
          <CardContent className="p-6">
            <PanelError
              onRetry={() => {
                void overviewQuery.refetch();
                void creditNotesQuery.refetch();
                void recurringQuery.refetch();
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

          <Tabs defaultValue="credit-notes">
            <TabsList aria-label="Invoicing sections">
              <TabsTrigger value="credit-notes">Credit notes</TabsTrigger>
              <TabsTrigger value="recurring">Recurring billing</TabsTrigger>
            </TabsList>

            <TabsContent value="credit-notes" className="space-y-4">
              {!creditNotes || creditNotes.items.length === 0 ? (
                <Card>
                  <CardContent className="p-6">
                    <PanelEmpty
                      icon={FileMinus}
                      title="No credit notes yet"
                      description="Credit notes against customer invoices will appear here."
                    />
                  </CardContent>
                </Card>
              ) : (
                <DataTable
                  columns={CREDIT_NOTE_COLUMNS}
                  data={creditNotes.items}
                  searchable
                  globalSearchPlaceholder="Search credit notes…"
                  getRowId={(note) => (note as CreditNote).code}
                  emptyState={{
                    icon: <FileMinus className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
                    title: "No credit notes",
                    description: "Issue a credit note from a sales invoice to get started.",
                  }}
                  noResultsState={{
                    icon: <FileMinus className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
                    title: "No matching credit notes",
                    description: "Try adjusting your search.",
                  }}
                />
              )}
            </TabsContent>

            <TabsContent value="recurring" className="space-y-4">
              {!recurring || recurring.items.length === 0 ? (
                <Card>
                  <CardContent className="p-6">
                    <PanelEmpty
                      icon={Repeat}
                      title="No recurring profiles yet"
                      description="Recurring billing profiles will show here."
                    />
                  </CardContent>
                </Card>
              ) : (
                <DataTable
                  columns={RECURRING_COLUMNS}
                  data={recurring.items}
                  searchable
                  globalSearchPlaceholder="Search profiles…"
                  getRowId={(profile) => (profile as RecurringProfile).code}
                  bulkActions={(rows) => (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pauseRecurring.isPending}
                        onClick={() => {
                          for (const profile of rows) pauseRecurring.mutate(profile.code);
                        }}
                      >
                        <Loader2 className={`mr-1 h-3.5 w-3.5 ${pauseRecurring.isPending ? "animate-spin" : ""}`} aria-hidden="true" />
                        Pause
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={resumeRecurring.isPending}
                        onClick={() => {
                          for (const profile of rows) resumeRecurring.mutate(profile.code);
                        }}
                      >
                        Resume
                      </Button>
                    </div>
                  )}
                  emptyState={{
                    icon: <Repeat className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
                    title: "No recurring profiles",
                    description: "Create a recurring profile to bill customers on a schedule.",
                  }}
                  noResultsState={{
                    icon: <Repeat className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
                    title: "No matching profiles",
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
