"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ReceiptText, Tags } from "lucide-react";
import { useState } from "react";
import type { LegacyColumnDef } from "@tanstack/react-table/legacy";
import type { ExpenseCategoryRecord, ExpenseClaim } from "@amni/shared";
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
import { formatCurrency } from "@/src/lib/format";
import { expensesClient } from "@/src/lib/expenses";
import { PanelEmpty, PanelError } from "@/src/components/dashboard/panel-utils";
import { NewExpenseClaimDialog } from "./new-expense-claim-dialog";
import { NewExpenseCategoryDialog } from "./new-expense-category-dialog";
import { ExpenseCategoryStatusBadge, ExpenseClaimStatusBadge } from "./claim-status";

const CLAIM_COLUMNS: LegacyColumnDef<ExpenseClaim>[] = [
  {
    accessorKey: "code",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Claim" />,
    cell: ({ row }) => (
      <Link
        href={`/finance/expenses/claims/${row.original.code}`}
        className="font-medium tabular-nums text-foreground hover:text-primary hover:underline"
      >
        {row.original.code}
      </Link>
    ),
  },
  {
    accessorKey: "employee",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Employee" />,
    cell: ({ row }) => <span className="text-foreground">{row.original.employee}</span>,
  },
  {
    accessorKey: "purpose",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Purpose" />,
    cell: ({ row }) => <span className="max-w-xs truncate text-muted-foreground">{row.original.purpose}</span>,
  },
  {
    accessorKey: "items",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Items" />,
    cell: ({ row }) => <span className="tabular-nums text-muted-foreground">{row.original.items.length}</span>,
  },
  {
    accessorKey: "total",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Total" />,
    cell: ({ row }) => (
      <span className="font-medium tabular-nums text-foreground">
        {formatCurrency(row.original.total, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => <ExpenseClaimStatusBadge status={row.original.status} />,
  },
];

const CATEGORY_COLUMNS: LegacyColumnDef<ExpenseCategoryRecord>[] = [
  {
    accessorKey: "code",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
    cell: ({ row }) => (
      <span className="font-medium tabular-nums text-foreground">{row.original.code}</span>
    ),
  },
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => <span className="text-foreground">{row.original.name}</span>,
  },
  {
    accessorKey: "color",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Color" />,
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.color}</span>,
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => <ExpenseCategoryStatusBadge status={row.original.status} />,
  },
];

export function ExpenseClaimsView() {
  const queryClient = useQueryClient();
  const [created, setCreated] = useState<{ code: string; label: string } | null>(null);

  const claimsQuery = useQuery({
    queryKey: ["expenses", "claims"],
    queryFn: () => expensesClient.listClaims({ page: 1, pageSize: 100, sortBy: "createdAt", sortDir: "desc" }),
    placeholderData: (previous) => previous,
  });

  const categoriesQuery = useQuery({
    queryKey: ["expenses", "categories"],
    queryFn: () => expensesClient.listCategories({ page: 1, pageSize: 100, sortBy: "name", sortDir: "asc" }),
    placeholderData: (previous) => previous,
  });

  const approveClaim = useMutation({
    mutationFn: (code: string) => expensesClient.changeClaimStatus(code, "approved"),
    onSuccess: (claim) => {
      void queryClient.invalidateQueries({ queryKey: ["expenses", "claims"] });
      void queryClient.invalidateQueries({ queryKey: ["expenses", "overview"] });
      setCreated({ code: claim.code, label: `Approved ${claim.code}` });
    },
  });

  const rejectClaim = useMutation({
    mutationFn: (code: string) => expensesClient.changeClaimStatus(code, "rejected"),
    onSuccess: (claim) => {
      void queryClient.invalidateQueries({ queryKey: ["expenses", "claims"] });
      void queryClient.invalidateQueries({ queryKey: ["expenses", "overview"] });
      setCreated({ code: claim.code, label: `Rejected ${claim.code}` });
    },
  });

  const archiveCategory = useMutation({
    mutationFn: (code: string) => expensesClient.changeCategoryStatus(code, "archived"),
    onSuccess: (category) => {
      void queryClient.invalidateQueries({ queryKey: ["expenses", "categories"] });
      void queryClient.invalidateQueries({ queryKey: ["expenses", "overview"] });
      setCreated({ code: category.code, label: `Archived ${category.code}` });
    },
  });

  const claims = claimsQuery.data;
  const categories = categoriesQuery.data;

  const loading = claimsQuery.isLoading || categoriesQuery.isLoading;

  const onCreated = (code: string, label: string) => {
    void queryClient.invalidateQueries({ queryKey: ["expenses", "claims"] });
    void queryClient.invalidateQueries({ queryKey: ["expenses", "categories"] });
    void queryClient.invalidateQueries({ queryKey: ["expenses", "overview"] });
    setCreated({ code, label: `${label} ${code}` });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Claims & categories</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Employee expense claims and the categories expenses can be tagged with.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NewExpenseCategoryDialog onCreated={(category) => onCreated(category.code, "Created")} />
          <NewExpenseClaimDialog onCreated={(claim) => onCreated(claim.code, "Created")} />
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

      {claimsQuery.isError || categoriesQuery.isError ? (
        <Card>
          <CardContent className="p-6">
            <PanelError
              onRetry={() => {
                void claimsQuery.refetch();
                void categoriesQuery.refetch();
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
        <Tabs defaultValue="claims">
          <TabsList aria-label="Claims and categories">
            <TabsTrigger value="claims">Claims</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>

          <TabsContent value="claims" className="space-y-4">
            {!claims || claims.items.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <PanelEmpty
                    icon={ReceiptText}
                    title="No expense claims yet"
                    description="Employee reimbursement claims will appear here."
                  />
                </CardContent>
              </Card>
            ) : (
              <DataTable
                columns={CLAIM_COLUMNS}
                data={claims.items}
                searchable
                globalSearchPlaceholder="Search claims…"
                getRowId={(claim) => (claim as ExpenseClaim).code}
                bulkActions={(rows) => (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={approveClaim.isPending}
                      onClick={() => {
                        for (const claim of rows) approveClaim.mutate(claim.code);
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={rejectClaim.isPending}
                      onClick={() => {
                        for (const claim of rows) rejectClaim.mutate(claim.code);
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                )}
                emptyState={{
                  icon: <ReceiptText className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
                  title: "No expense claims",
                  description: "Create a claim to reimburse an employee.",
                }}
                noResultsState={{
                  icon: <ReceiptText className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
                  title: "No matching claims",
                  description: "Try adjusting your search.",
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            {!categories || categories.items.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <PanelEmpty
                    icon={Tags}
                    title="No categories yet"
                    description="Expense categories will appear here."
                  />
                </CardContent>
              </Card>
            ) : (
              <DataTable
                columns={CATEGORY_COLUMNS}
                data={categories.items}
                searchable
                globalSearchPlaceholder="Search categories…"
                getRowId={(category) => (category as ExpenseCategoryRecord).code}
                bulkActions={(rows) => (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={archiveCategory.isPending}
                    onClick={() => {
                      for (const category of rows) archiveCategory.mutate(category.code);
                    }}
                  >
                    Archive
                  </Button>
                )}
                emptyState={{
                  icon: <Tags className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
                  title: "No categories",
                  description: "Create a category to organize expenses.",
                }}
                noResultsState={{
                  icon: <Tags className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
                  title: "No matching categories",
                  description: "Try adjusting your search.",
                }}
              />
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
