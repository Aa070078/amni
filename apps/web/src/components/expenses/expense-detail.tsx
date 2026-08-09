"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardX,
  Hash,
  Receipt,
  StickyNote,
  UserRound,
  Wallet,
} from "lucide-react";
import { EXPENSE_CATEGORIES, EXPENSE_STATUSES, type ExpenseStatus } from "@amni/shared";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Skeleton,
} from "@amni/ui";
import { formatCurrency } from "@/src/lib/format";
import { AmniApiError } from "@/src/lib/client";
import { expensesClient, formatExpenseDate } from "@/src/lib/expenses";
import { ExpenseStatusBadge, expenseStatusLabel } from "./expense-status";

interface ExpenseDetailViewProps {
  code: string;
}

export function ExpenseDetailView({ code }: ExpenseDetailViewProps) {
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ["expenses", "detail", code],
    queryFn: () => expensesClient.detail(code),
    retry: (failureCount, error) => {
      if (error instanceof AmniApiError && error.status === 404) return false;
      return failureCount < 2;
    },
  });

  const changeStatus = useMutation({
    mutationFn: (status: ExpenseStatus) => expensesClient.changeStatus(code, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["expenses", "detail", code] });
      void queryClient.invalidateQueries({ queryKey: ["expenses", "list"] });
    },
  });

  const removeExpense = useMutation({
    mutationFn: () => expensesClient.remove(code),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["expenses", "list"] });
      window.location.assign("/finance/expenses");
    },
  });

  if (detailQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-40 rounded-lg" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-48 rounded-lg lg:col-span-2" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </div>
    );
  }

  if (detailQuery.isError) {
    const is404 = detailQuery.error instanceof AmniApiError && detailQuery.error.status === 404;
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
          <Receipt className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-base font-semibold">
              {is404 ? "Expense not found" : "Couldn&apos;t load this expense"}
            </p>
            <p className="text-sm text-muted-foreground">
              {is404
                ? `No expense matches ${code}. It may have been removed.`
                : "Something went wrong. Please try again."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!is404 ? (
              <Button variant="outline" onClick={() => void detailQuery.refetch()}>
                Retry
              </Button>
            ) : null}
            <Button asChild variant={is404 ? "default" : "outline"}>
              <Link href="/finance/expenses">
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Back to expenses
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const expense = detailQuery.data;
  if (!expense) return null;

  const category = EXPENSE_CATEGORIES.find((entry) => entry.value === expense.category);
  const total = expense.amount + expense.vat;
  const isDraft = expense.status === "draft";

  return (
    <div className="space-y-6">
      <Link
        href="/finance/expenses"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Expenses
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{expense.code}</h1>
              <ExpenseStatusBadge status={expense.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{expense.description}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>Spent {formatExpenseDate(expense.date)}</span>
              <span>{category?.label ?? expense.category}</span>
              {expense.claimedBy ? (
                <span className="inline-flex items-center gap-1">
                  <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                  {expense.claimedBy}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:items-end">
            <div className="flex flex-col items-start gap-1 sm:items-end">
              <span className="text-2xl font-semibold tabular-nums tracking-tight">
                {formatCurrency(total, expense.currency)}
              </span>
              <span className="text-xs text-muted-foreground">
                Amount {formatCurrency(expense.amount, expense.currency)} · VAT{" "}
                {formatCurrency(expense.vat, expense.currency)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={changeStatus.isPending}>
                    <ChevronDown className="mr-2 h-4 w-4" aria-hidden="true" />
                    Change status
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Set status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {EXPENSE_STATUSES.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      disabled={option.value === expense.status || changeStatus.isPending}
                      onClick={() => changeStatus.mutate(option.value)}
                    >
                      {option.value === expense.status ? (
                        <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                      ) : (
                        <span className="mr-2 inline-block w-4" aria-hidden="true" />
                      )}
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {isDraft ? (
                <Button
                  variant="outline"
                  disabled={removeExpense.isPending}
                  onClick={() => {
                    if (window.confirm(`Delete ${expense.code}? This cannot be undone.`)) removeExpense.mutate();
                  }}
                >
                  <ClipboardX className="mr-2 h-4 w-4" aria-hidden="true" />
                  Delete
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <StickyNote className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{expense.description}</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DetailRow icon={CalendarDays} label="Date" value={formatExpenseDate(expense.date)} />
              <DetailRow icon={Building2} label="Category" value={category?.label ?? expense.category} />
              <DetailRow icon={Building2} label="Supplier" value={expense.supplier ?? "—"} />
              <DetailRow icon={UserRound} label="Claimed by" value={expense.claimedBy ?? "—"} />
              <DetailRow icon={Hash} label="Payment reference" value={expense.paymentRef ?? "—"} />
              <DetailRow icon={Receipt} label="Status" value={expenseStatusLabel(expense.status)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Summary
              </CardTitle>
              <CardDescription>Net amount, VAT, and total.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="tabular-nums text-foreground">{formatCurrency(expense.amount, expense.currency)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">VAT</span>
                <span className="tabular-nums text-foreground">{formatCurrency(expense.vat, expense.currency)}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-3 font-medium">
                <span className="text-foreground">Total</span>
                <span className="tabular-nums text-foreground">{formatCurrency(total, expense.currency)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="truncate text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
}
