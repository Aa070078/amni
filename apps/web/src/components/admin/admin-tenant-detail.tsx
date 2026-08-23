"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Pause, Play, Archive } from "lucide-react";
import { Button } from "@amni/ui";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@amni/ui";
import { adminClient } from "@/src/lib/admin";
import { formatDate, formatDateTime } from "@/src/lib/format";
import {
  HealthBadge,
  PlanTierBadge,
  ProvisioningJobStateBadge,
  SubscriptionStatusBadge,
  TenantStatusBadge,
} from "./admin-status";

interface AdminTenantDetailProps {
  tenantId: string;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value ?? "—"}</dd>
    </div>
  );
}

export function AdminTenantDetail({ tenantId }: AdminTenantDetailProps) {
  const queryClient = useQueryClient();
  const detailQuery = useQuery({
    queryKey: ["admin", "tenant", tenantId],
    queryFn: () => adminClient.tenant(tenantId),
  });

  const suspendMut = useMutation({
    mutationFn: () => adminClient.suspendTenant(tenantId),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["admin", "tenant", tenantId] }); void queryClient.invalidateQueries({ queryKey: ["admin", "tenants"] }); },
  });
  const resumeMut = useMutation({
    mutationFn: () => adminClient.resumeTenant(tenantId),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["admin", "tenant", tenantId] }); void queryClient.invalidateQueries({ queryKey: ["admin", "tenants"] }); },
  });
  const archiveMut = useMutation({
    mutationFn: () => adminClient.archiveTenant(tenantId),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["admin", "tenant", tenantId] }); void queryClient.invalidateQueries({ queryKey: ["admin", "tenants"] }); },
  });
  const planMut = useMutation({
    mutationFn: (plan: "starter" | "growth" | "scale") => adminClient.changeTenantPlan(tenantId, plan),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["admin", "tenant", tenantId] }); void queryClient.invalidateQueries({ queryKey: ["admin", "tenants"] }); },
  });

  if (detailQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  const tenant = detailQuery.data;

  if (detailQuery.isError || !tenant) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Failed to load this tenant. It may have been removed.
        </CardContent>
      </Card>
    );
  }

  const owner = tenant.members.find((member) => member.platformRole === "OWNER");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/admin/tenants"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Tenants
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{tenant.companyName}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            {tenant.siteName}
            <Link
              href={tenant.siteUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              {tenant.siteUrl}
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TenantStatusBadge status={tenant.status} />
          <PlanTierBadge tier={tenant.planTier} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {tenant.status === "ACTIVE" ? (
          <Button variant="outline" size="sm" onClick={() => suspendMut.mutate()} disabled={suspendMut.isPending}>
            <Pause className="mr-1.5 h-3.5 w-3.5" /> Suspend
          </Button>
        ) : tenant.status === "SUSPENDED" ? (
          <Button variant="outline" size="sm" onClick={() => resumeMut.mutate()} disabled={resumeMut.isPending}>
            <Play className="mr-1.5 h-3.5 w-3.5" /> Resume
          </Button>
        ) : null}
        {tenant.status !== "ARCHIVED" ? (
          <Button variant="outline" size="sm" onClick={() => { if (confirm("Archive this tenant? This action cannot be undone.")) archiveMut.mutate(); }} disabled={archiveMut.isPending}>
            <Archive className="mr-1.5 h-3.5 w-3.5" /> Archive
          </Button>
        ) : null}
        <select
          value={tenant.planTier}
          onChange={(e) => { if (confirm(`Change plan to ${e.target.value}?`)) planMut.mutate(e.target.value as "starter" | "growth" | "scale"); }}
          className="rounded-md border bg-background px-2 py-1 text-sm"
        >
          <option value="starter">Starter</option>
          <option value="growth">Growth</option>
          <option value="scale">Scale</option>
        </select>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Company</CardTitle>
            <CardDescription>Profile recorded at signup.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="divide-y">
              <DetailRow label="Slug" value={tenant.companySlug} />
              <DetailRow label="Status" value={tenant.companyStatus.toLowerCase()} />
              <DetailRow label="Industry" value={tenant.industry} />
              <DetailRow label="Country" value={tenant.country} />
              <DetailRow label="Region" value={tenant.region} />
              <DetailRow label="ERPNext version" value={tenant.erpnextVersion} />
              <DetailRow label="HRMS installed" value={tenant.hrmsInstalled ? "Yes" : "No"} />
              <DetailRow label="Created" value={formatDate(tenant.createdAt)} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subscription</CardTitle>
            <CardDescription>Current plan and billing state.</CardDescription>
          </CardHeader>
          <CardContent>
            {tenant.subscription ? (
              <dl className="divide-y">
                <div className="flex items-center justify-between gap-4 py-2 text-sm">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd>
                    <SubscriptionStatusBadge status={tenant.subscription.status} />
                  </dd>
                </div>
                <DetailRow label="Plan" value={tenant.subscription.planName} />
                <DetailRow label="Tier" value={<PlanTierBadge tier={tenant.subscription.planTier} />} />
                <DetailRow label="Started" value={formatDate(tenant.subscription.startsAt)} />
                <DetailRow
                  label="Trial ends"
                  value={tenant.subscription.trialEndsAt ? formatDate(tenant.subscription.trialEndsAt) : null}
                />
                <DetailRow
                  label="Ends"
                  value={tenant.subscription.endsAt ? formatDate(tenant.subscription.endsAt) : null}
                />
                <DetailRow
                  label="Cancelled"
                  value={tenant.subscription.cancelledAt ? formatDate(tenant.subscription.cancelledAt) : null}
                />
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">No subscription on file.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">ERP instance</CardTitle>
            <CardDescription>Provisioned site health and placement.</CardDescription>
          </CardHeader>
          <CardContent>
            {tenant.erpInstance ? (
              <dl className="divide-y">
                <div className="flex items-center justify-between gap-4 py-2 text-sm">
                  <dt className="text-muted-foreground">Health</dt>
                  <dd>
                    <HealthBadge health={tenant.erpInstance.health} />
                  </dd>
                </div>
                <DetailRow label="Host" value={tenant.erpInstance.host} />
                <DetailRow label="Cluster" value={tenant.erpInstance.cluster} />
                <DetailRow label="Capacity group" value={tenant.erpInstance.capacityGroup} />
                <DetailRow
                  label="Last health check"
                  value={
                    tenant.erpInstance.lastHealthCheckAt
                      ? formatDateTime(tenant.erpInstance.lastHealthCheckAt)
                      : null
                  }
                />
                <DetailRow label="Provisioned" value={formatDate(tenant.erpInstance.createdAt)} />
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">No ERP instance yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members</CardTitle>
          <CardDescription>
            {tenant.memberCount} member{tenant.memberCount === 1 ? "" : "s"}
            {owner ? ` · owner ${owner.firstName} ${owner.lastName ?? ""}`.trim() : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Platform role</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenant.members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      {member.firstName} {member.lastName}
                    </TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>{member.platformRole.toLowerCase()}</TableCell>
                    <TableCell>{formatDate(member.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Provisioning jobs</CardTitle>
          <CardDescription>History of async provisioning work on this tenant.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Finished</TableHead>
                  <TableHead>Last error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenant.provisioningJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">{job.type.replace("_", " ").toLowerCase()}</TableCell>
                    <TableCell>
                      <ProvisioningJobStateBadge state={job.state} />
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {job.attempts}/{job.maxAttempts}
                    </TableCell>
                    <TableCell>{formatDateTime(job.createdAt)}</TableCell>
                    <TableCell>{job.startedAt ? formatDateTime(job.startedAt) : "—"}</TableCell>
                    <TableCell>{job.finishedAt ? formatDateTime(job.finishedAt) : "—"}</TableCell>
                    <TableCell className="max-w-xs truncate" title={job.lastError ?? undefined}>
                      {job.lastError ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {tenant.provisioningJobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">
                      No provisioning jobs yet.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
