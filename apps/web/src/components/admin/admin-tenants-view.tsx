"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { AdminTenantListQuery, TenantStatus } from "@amni/shared";
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@amni/ui";
import { adminClient } from "@/src/lib/admin";
import { formatDate } from "@/src/lib/format";
import { HealthBadge, PlanTierBadge, TENANT_STATUS_LABELS, TenantStatusBadge } from "./admin-status";

const STATUS_OPTIONS = Object.entries(TENANT_STATUS_LABELS) as [TenantStatus, string][];
const PAGE_SIZE = 20;

export function AdminTenantsView() {
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [status, setStatus] = React.useState<TenantStatus | "ALL">("ALL");

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status]);

  const query: AdminTenantListQuery = {
    page,
    pageSize: PAGE_SIZE,
    q: debouncedSearch || undefined,
    status: status === "ALL" ? undefined : status,
  };

  const tenantsQuery = useQuery({
    queryKey: ["admin", "tenants", query],
    queryFn: () => adminClient.tenants(query),
    placeholderData: (previous) => previous,
  });

  const { items, meta } = tenantsQuery.data ?? { items: [], meta: { total: 0, page: 1, pageSize: PAGE_SIZE } };
  const totalPages = Math.max(1, Math.ceil(meta.total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tenants</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every company workspace, its plan, subscription, and provisioning state.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative sm:max-w-sm">
                <Search
                  className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search companies…"
                  className="pl-8"
                  aria-label="Search tenants"
                />
              </div>
              <div className="w-full sm:w-48">
                <Label htmlFor="tenant-status-filter" className="sr-only">
                  Filter by status
                </Label>
                <Select value={status} onValueChange={(value) => setStatus(value as TenantStatus | "ALL")}>
                  <SelectTrigger id="tenant-status-filter">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All statuses</SelectItem>
                    {STATUS_OPTIONS.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground tabular-nums">{meta.total}</span> total
            </p>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenantsQuery.isLoading ? (
                  Array.from({ length: 8 }).map((_, rowIndex) => (
                    <TableRow key={`skeleton-${rowIndex}`} className="hover:bg-transparent">
                      {Array.from({ length: 8 }).map((_, colIndex) => (
                        <TableCell key={`cell-${colIndex}`}>
                          <Skeleton
                            className="h-4"
                            style={{ width: `${Math.min(90, 45 + ((rowIndex * 7 + colIndex * 13) % 45))}%` }}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : items.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={8} className="h-40 text-center text-sm text-muted-foreground">
                      {debouncedSearch || status !== "ALL"
                        ? "No tenants match your filters."
                        : "No tenants yet."}
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell>
                        <Link
                          href={`/admin/tenants/${tenant.id}`}
                          className="font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {tenant.companyName}
                        </Link>
                        <p className="text-xs text-muted-foreground">{tenant.siteName}</p>
                      </TableCell>
                      <TableCell>
                        <TenantStatusBadge status={tenant.status} />
                      </TableCell>
                      <TableCell>
                        <PlanTierBadge tier={tenant.planTier} />
                      </TableCell>
                      <TableCell>
                        {tenant.subscriptionStatus ? (
                          <span className="text-sm capitalize">
                            {tenant.subscriptionStatus.replace("_", " ").toLowerCase()}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                        {tenant.trialEndsAt ? (
                          <p className="text-xs text-muted-foreground">trial ends {formatDate(tenant.trialEndsAt)}</p>
                        ) : null}
                      </TableCell>
                      <TableCell className="tabular-nums">{tenant.memberCount}</TableCell>
                      <TableCell>{tenant.ownerEmail ?? "—"}</TableCell>
                      <TableCell>{tenant.health ? <HealthBadge health={tenant.health} /> : "—"}</TableCell>
                      <TableCell>{formatDate(tenant.createdAt)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {!tenantsQuery.isLoading && items.length > 0 ? (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Page <span className="font-medium text-foreground">{meta.page}</span> of{" "}
                <span className="font-medium text-foreground">{totalPages}</span>
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" aria-hidden="true" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
