"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { LegacyColumnDef } from "@tanstack/react-table/legacy";
import { CheckCircle2, FileText, Search, TrendingUp, UserRound, Users } from "lucide-react";
import type { Customer } from "@amni/shared";
import {
  Badge,
  Button,
  Card,
  CardContent,
  DataTable,
  DataTableColumnHeader,
  Skeleton,
  type BadgeProps,
} from "@amni/ui";
import { formatCurrency } from "@/src/lib/format";
import { customersClient } from "@/src/lib/customers";
import { CustomerStatusBadge } from "./customer-status";
import { NewCustomerDialog } from "./new-customer-dialog";

const CUSTOMER_TYPE_META: Record<Customer["type"], BadgeProps["variant"]> = {
  company: "outline",
  individual: "secondary",
};

const CUSTOMER_TYPE_LABELS: Record<Customer["type"], string> = {
  company: "Company",
  individual: "Individual",
};

const LIST_COLUMNS: LegacyColumnDef<Customer>[] = [
  {
    accessorKey: "code",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Customer" />,
    cell: ({ row }) => {
      const customer = row.original;
      return (
        <Link
          href={`/sales/customers/${customer.code}`}
          className="font-medium tabular-nums text-foreground hover:text-primary hover:underline"
        >
          {customer.code}
        </Link>
      );
    },
  },
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => <span className="text-foreground">{row.original.name}</span>,
  },
  {
    accessorKey: "type",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
    cell: ({ row }) => (
      <Badge variant={CUSTOMER_TYPE_META[row.original.type]}>{CUSTOMER_TYPE_LABELS[row.original.type]}</Badge>
    ),
  },
  {
    accessorKey: "group",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Group" />,
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.group}</span>,
  },
  {
    accessorKey: "email",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.email ?? "—"}</span>,
  },
  {
    accessorKey: "currency",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Currency" />,
    cell: ({ row }) => <span className="tabular-nums text-muted-foreground">{row.original.currency}</span>,
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => <CustomerStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "outstanding",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Outstanding" />,
    cell: ({ row }) => (
      <span className="font-medium tabular-nums text-foreground">
        {formatCurrency(row.original.outstanding, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: "totalSales",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Sales" />,
    cell: ({ row }) => (
      <span className="font-medium tabular-nums text-foreground">
        {formatCurrency(row.original.totalSales, row.original.currency)}
      </span>
    ),
  },
];

export function CustomersView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("new") !== "1") return;
    setDialogOpen(true);
    router.replace("/sales/customers", { scroll: false });
  }, [router, searchParams]);
  const [createdCustomer, setCreatedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!createdCustomer) return;
    const timer = setTimeout(() => setCreatedCustomer(null), 5000);
    return () => clearTimeout(timer);
  }, [createdCustomer]);

  const listQuery = useQuery({
    queryKey: ["customers", "list", debouncedSearch],
    queryFn: () =>
      customersClient.list({
        page: 1,
        pageSize: 100,
        sortBy: "createdAt",
        sortDir: "desc",
        q: debouncedSearch.trim() || undefined,
      }),
    placeholderData: (previous) => previous,
  });

  const createCustomer = (customer: Customer) => {
    setCreatedCustomer(customer);
    void queryClient.invalidateQueries({ queryKey: ["customers", "list"] });
  };

  const data = listQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage the people and companies you sell to and track what they owe.
          </p>
        </div>
        <NewCustomerDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreate={createCustomer} />
      </div>

      {createdCustomer ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Created{" "}
            <Link
              href={`/sales/customers/${createdCustomer.code}`}
              className="font-semibold underline underline-offset-2"
            >
              {createdCustomer.code}
            </Link>{" "}
            for {createdCustomer.name}.
          </span>
        </div>
      ) : null}

      {listQuery.isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <TrendingUp className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-base font-semibold">Couldn&apos;t load your customers</p>
              <p className="text-sm text-muted-foreground">
                Something went wrong fetching your customers. Please try again.
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
      ) : data.items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <Users className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-base font-semibold">
                {debouncedSearch ? "No matching customers" : "No customers yet"}
              </p>
              <p className="text-sm text-muted-foreground">
                {debouncedSearch ? "Try adjusting your search." : "Add your first customer to start selling."}
              </p>
            </div>
            {debouncedSearch ? (
              <Button variant="outline" onClick={() => setSearch("")}>
                Clear search
              </Button>
            ) : (
              <Button onClick={() => setDialogOpen(true)}>New customer</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="relative">
            <Search
              className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search customers…"
              aria-label="Search customers"
              className="h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-sm"
            />
          </div>

          <DataTable
            columns={LIST_COLUMNS}
            data={data.items}
            searchable
            globalSearchPlaceholder="Search customers…"
            getRowId={(customer) => (customer as Customer).code}
            initialSorting={[{ id: "name", desc: false }]}
            emptyState={{
              icon: <UserRound className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
              title: "No customers yet",
              description: "Add your first customer to start selling.",
            }}
            noResultsState={{
              icon: <FileText className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
              title: "No matching customers",
              description: "Try adjusting your search or clear the filters.",
            }}
          />
        </>
      )}
    </div>
  );
}
