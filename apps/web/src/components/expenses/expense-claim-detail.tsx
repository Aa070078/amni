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
  ReceiptText,
  StickyNote,
  UserRound,
  Wallet,
} from "lucide-react";
import { EXPENSE_CATEGORIES, EXPENSE_CLAIM_STATUSES, type ExpenseClaimStatus } from "@amni/shared";
import {
  Badge,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@amni/ui";
import { formatCurrency } from "@/src/lib/format";
import { AmniApiError } from "@/src/lib/client";
import { expensesClient, formatExpenseDate } from "@/src/lib/expenses";
import { ExpenseClaimStatusBadge } from "./claim-status";

interface ExpenseClaimDetailViewProps {
  code: string;
}

export function ExpenseClaimDetailView({ code }: ExpenseClaimDetailViewProps) {
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ["expenses", "claims", "detail", code],
    queryFn: () => expensesClient.claimDetail(code),
    retry: (failureCount, error) => {
      if (error instanceof AmniApiError && error.status === 404) return false;
      return failureCount < 2;
    },
  });

  const changeStatus = useMutation({
    mutationFn: (status: ExpenseClaimStatus) => expensesClient.changeClaimStatus(code, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["expenses", "claims", "detail", code] });
      void queryClient.invalidateQueries({ queryKey: ["expenses", "claims"] });
    },
  });

  const removeClaim = useMutation({
    mutationFn: () => expensesClient.removeClaim(code),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["expenses", "claims"] });
      window.location.assign("/finance/expenses/claims");
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
          <ReceiptText className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-base font-semibold">
              {is404 ? "Claim not found" : "Couldn&apos;t load this claim"}
            </p>
            <p className="text-sm text-muted-foreground">
              {is404 ? `No claim matches ${code}. It may have been removed.` : "Something went wrong. Please try again."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!is404 ? (
              <Button variant="outline" onClick={() => void detailQuery.refetch()}>
                Retry
              </Button>
            ) : null}
            <Button asChild variant={is404 ? "default" : "outline"}>
              <Link href="/finance/expenses/claims">
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Back to claims
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const claim = detailQuery.data;
  if (!claim) return null;

  const isDraft = claim.status === "draft";

  return (
    <div className="space-y-6">
      <Link
        href="/finance/expenses/claims"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Claims
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{claim.code}</h1>
              <ExpenseClaimStatusBadge status={claim.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{claim.purpose}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                {claim.employee}
              </span>
              {claim.department ? (
                <span className="inline-flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {claim.department}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:items-end">
            <div className="flex flex-col items-start gap-1 sm:items-end">
              <span className="text-2xl font-semibold tabular-nums tracking-tight">
                {formatCurrency(claim.total, claim.currency)}
              </span>
              <span className="text-xs text-muted-foreground">
                {claim.items.length} item{claim.items.length === 1 ? "" : "s"}
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
                  {EXPENSE_CLAIM_STATUSES.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      disabled={option.value === claim.status || changeStatus.isPending}
                      onClick={() => changeStatus.mutate(option.value)}
                    >
                      {option.value === claim.status ? (
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
                  disabled={removeClaim.isPending}
                  onClick={() => {
                    if (window.confirm(`Delete ${claim.code}? This cannot be undone.`)) removeClaim.mutate();
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
                <ReceiptText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claim.items.map((item, index) => {
                    const category = EXPENSE_CATEGORIES.find((entry) => entry.value === item.category);
                    return (
                      <TableRow key={item.code ?? `${claim.code}-item-${index}`}>
                        <TableCell className="text-foreground">{item.description}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{category?.label ?? item.category}</Badge>
                        </TableCell>
                        <TableCell className="tabular-nums text-muted-foreground">
                          {formatExpenseDate(item.date)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-foreground">
                          {formatCurrency(item.amount, claim.currency)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {claim.notes ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <StickyNote className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{claim.notes}</p>
              </CardContent>
            </Card>
          ) : null}
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
              <DetailRow icon={UserRound} label="Employee" value={claim.employee} />
              <DetailRow icon={Building2} label="Department" value={claim.department ?? "—"} />
              <DetailRow icon={Hash} label="Currency" value={claim.currency} />
              <DetailRow icon={ReceiptText} label="Status" value={claim.status} />
              {claim.paidDate ? (
                <DetailRow icon={CalendarDays} label="Paid on" value={formatExpenseDate(claim.paidDate)} />
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Summary
              </CardTitle>
              <CardDescription>Total reimbursement for this claim.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Items</span>
                <span className="tabular-nums text-foreground">{claim.items.length}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-3 font-medium">
                <span className="text-foreground">Total</span>
                <span className="tabular-nums text-foreground">{formatCurrency(claim.total, claim.currency)}</span>
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
