"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, CheckCircle2 } from "lucide-react";
import type { Organization, OrganizationStatus } from "@amni/shared";
import { Button, Card, CardContent, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton } from "@amni/ui";
import { crmClient } from "@/src/lib/crm";
import { formatCurrency } from "@/src/lib/format";
import { CrmSectionHeader } from "./crm-nav";
import { OrganizationsTable } from "./organizations/organizations-table";
import { NewOrganizationDialog } from "./organizations/new-organization-dialog";

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

export function OrganizationsView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<OrganizationStatus | "">("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createdOrg, setCreatedOrg] = useState<Organization | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!createdOrg) return;
    const timer = setTimeout(() => setCreatedOrg(null), 5000);
    return () => clearTimeout(timer);
  }, [createdOrg]);

  const orgsQuery = useQuery({
    queryKey: ["crm", "organizations", { q: debouncedSearch, status }],
    queryFn: () =>
      crmClient.organizations.list({
        q: debouncedSearch.trim() || undefined,
        status: status || undefined,
      }),
    placeholderData: (previous) => previous,
  });

  const createOrg = useMutation({
    mutationFn: crmClient.organizations.create,
    onSuccess: (org) => {
      setCreatedOrg(org);
      void queryClient.invalidateQueries({ queryKey: ["crm", "organizations"] });
    },
  });

  const data = orgsQuery.data;

  return (
    <div className="space-y-6">
      <CrmSectionHeader
        title="Companies"
        description="Manage the companies you work with and track relationships."
      >
        <NewOrganizationDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onCreate={(org) => createOrg.mutate(org)}
        />
      </CrmSectionHeader>

      {createdOrg ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Created{" "}
            <Link
              href={`/sales/crm/organizations/${createdOrg.code}`}
              className="font-semibold underline underline-offset-2"
            >
              {createdOrg.code}
            </Link>{" "}
            for {createdOrg.name}.
          </span>
        </div>
      ) : null}

      {orgsQuery.isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : orgsQuery.isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <Building2 className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-base font-semibold">Couldn&apos;t load companies</p>
              <p className="text-sm text-muted-foreground">Something went wrong. Please try again.</p>
            </div>
            <Button variant="outline" onClick={() => void orgsQuery.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Total companies" value={String(data?.stats.total ?? 0)} />
            <StatCard label="Active" value={String(data?.stats.active ?? 0)} />
            <StatCard label="Leads" value={String(data?.stats.leads ?? 0)} />
            <StatCard
              label="Open deal value"
              value={formatCurrency(data?.stats.openDealValue ?? 0, "USD")}
              hint={`${data?.stats.contacts ?? 0} linked contacts`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:max-w-sm">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search companies…"
                aria-label="Search companies"
                className="h-9 w-full rounded-md border border-input bg-transparent pl-3 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <Select value={status} onValueChange={(value) => setStatus(value as OrganizationStatus | "")}>
              <SelectTrigger className="h-9 w-36" aria-label="Filter by status">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <OrganizationsTable data={data?.items ?? []} loading={orgsQuery.isFetching} />
        </>
      )}
    </div>
  );
}
