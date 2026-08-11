"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { LegacyColumnDef } from "@tanstack/react-table/legacy";
import { ArrowLeft, CheckCircle2, FileText, Receipt, Search, TrendingUp, X } from "lucide-react";
import { EXPENSE_CATEGORIES, EXPENSE_STATUSES, type Expense, type ExpenseStatus } from "@amni/shared";
import {
  Badge,
  Button,
  Card,
  CardContent,
  DataTable,
  DataTableColumnHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  type BadgeProps,
} from "@amni/ui";
import { formatCurrency } from "@/src/lib/format";
import { expensesClient, formatExpenseDate } from "@/src/lib/expenses";
import { NewExpenseDialog } from "./new-expense-dialog";
import { ExpenseStatusBadge } from "./expense-status";

const CATEGORY_VARIANTS: Record<Expense["category"], BadgeProps["variant"]> = {
  travel: "secondary",
  office: "secondary",
  utilities: "secondary",
  software: "secondary",
  marketing: "secondary",
  professional_services: "secondary",
  rent: "secondary",
  equipment: "secondary",
  other: "outline",
};

function categoryLabel(value: Expense["category"]): string {
  return EXPENSE_CATEGORIES.find((entry) => entry.value === value)?.label ?? value;
}

const LIST_COLUMNS: LegacyColumnDef<Expense>[] = [
  {
    accessorKey: "code",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Expense" />,
    cell: ({ row }) => {
      const expense = row.original;
      return (
        <Link
          href={`/finance/expenses/${expense.code}`}
          className="font-medium tabular-nums text-foreground hover:text-primary hover:underline"
        >
          {expense.code}
        </Link>
      );
    },
  },
  {
    accessorKey: "date",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
    cell: ({ row }) => <span className="tabular-nums text-muted-foreground">{formatExpenseDate(row.original.date)}</span>,
  },
  {
    accessorKey: "category",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
    cell: ({ row }) => (
      <Badge variant={CATEGORY_VARIANTS[row.original.category]}>{categoryLabel(row.original.category)}</Badge>
    ),
  },
  {
    accessorKey: "description",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
    cell: ({ row }) => <span className="text-foreground">{row.original.description}</span>,
  },
  {
    accessorKey: "supplier",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Supplier" />,
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.supplier ?? "—"}</span>,
  },
  {
    accessorKey: "amount",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
    cell: ({ row }) => (
      <span className="font-medium tabular-nums text-foreground">
        {formatCurrency(row.original.amount, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: "vat",
    header: ({ column }) => <DataTableColumnHeader column={column} title="VAT" />,
    cell: ({ row }) => (
      <span className="tabular-nums text-muted-foreground">
        {formatCurrency(row.original.vat, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => <ExpenseStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "claimedBy",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Claimed by" />,
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.claimedBy ?? "—"}</span>,
  },
];

export function ExpensesView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState<Expense["category"] | "all">("all");
  const [status, setStatus] = useState<ExpenseStatus | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createdExpense, setCreatedExpense] = useState<Expense | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!createdExpense) return;
    const timer = setTimeout(() => setCreatedExpense(null), 5000);
    return () => clearTimeout(timer);
  }, [createdExpense]);

  const listQuery = useQuery({
    queryKey: ["expenses", "list", debouncedSearch, category, status],
    queryFn: () =>
      expensesClient.list({
        page: 1,
        pageSize: 100,
        sortBy: "date",
        sortDir: "desc",
        q: debouncedSearch.trim() || undefined,
        category: category === "all" ? undefined : category,
        status: status === "all" ? undefined : status,
      }),
    placeholderData: (previous) => previous,
  });

  const createExpense = (expense: Expense) => {
    setCreatedExpense(expense);
    void queryClient.invalidateQueries({ queryKey: ["expenses", "list"] });
  };

  const hasActiveFilters = Boolean(debouncedSearch) || category !== "all" || status !== "all";

  const clearFilters = () => {
    setSearch("");
    setCategory("all");
    setStatus("all");
  };

  const data = listQuery.data;

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
          <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track costs from draft through approval and payment.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/finance/expenses/claims">Claims & categories</Link>
          </Button>
          <NewExpenseDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreate={createExpense} />
        </div>
      </div>

      {createdExpense ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Created{" "}
            <Link
              href={`/finance/expenses/${createdExpense.code}`}
              className="font-semibold underline underline-offset-2"
            >
              {createdExpense.code}
            </Link>{" "}
            · {createdExpense.description}
          </span>
        </div>
      ) : null}

      {listQuery.isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <TrendingUp className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-base font-semibold">Couldn&apos;t load your expenses</p>
              <p className="text-sm text-muted-foreground">
                Something went wrong fetching your expenses. Please try again.
              </p>
            </div>
            <Button variant="outline" onClick={() => void listQuery.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : listQuery.isLoading || !data ? (
        <div className="space-y-4">
          <div className="relative w-full overflow-auto rounded-md border">
            <div className="space-y-3 p-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-8 rounded-md" />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search
                className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search expenses…"
                aria-label="Search expenses"
                className="h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-sm"
              />
            </div>
            <Select value={category} onValueChange={(value) => setCategory(value as Expense["category"] | "all")}>
              <SelectTrigger className="w-44" aria-label="Filter by category">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {EXPENSE_CATEGORIES.map((entry) => (
                  <SelectItem key={entry.value} value={entry.value}>
                    {entry.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(value) => setStatus(value as ExpenseStatus | "all")}>
              <SelectTrigger className="w-40" aria-label="Filter by status">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {EXPENSE_STATUSES.map((entry) => (
                  <SelectItem key={entry.value} value={entry.value}>
                    {entry.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasActiveFilters ? (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-1 h-4 w-4" aria-hidden="true" />
                Clear filters
              </Button>
            ) : null}
          </div>

          {data.items.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
                <Receipt className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="text-base font-semibold">
                    {hasActiveFilters ? "No matching expenses" : "No expenses yet"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {hasActiveFilters
                      ? "Try adjusting your search or filters."
                      : "Create your first expense to start tracking costs."}
                  </p>
                </div>
                {hasActiveFilters ? (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : (
                  <Button onClick={() => setDialogOpen(true)}>New expense</Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <DataTable
              columns={LIST_COLUMNS}
              data={data.items}
              searchable
              globalSearchPlaceholder="Search expenses…"
              getRowId={(expense) => (expense as Expense).code}
              initialSorting={[{ id: "date", desc: true }]}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={clearFilters}
              emptyState={{
                icon: <FileText className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
                title: "No expenses yet",
                description: "Create your first expense to start tracking costs.",
              }}
              noResultsState={{
                icon: <Receipt className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
                title: "No matching expenses",
                description: "Try adjusting your search or filters.",
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
