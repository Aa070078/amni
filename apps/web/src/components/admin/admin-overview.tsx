"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, Building2, CheckCircle2, Globe, Users } from "lucide-react";
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
import { formatDate } from "@/src/lib/format";
import { PlanTierBadge, TenantStatusBadge } from "./admin-status";

const STAT_CARDS = [
  { key: "totalUsers", label: "Platform users", icon: Users },
  { key: "totalCompanies", label: "Companies", icon: Building2 },
  { key: "totalTenants", label: "Active tenants", icon: Globe },
  { key: "activeSubscriptions", label: "Active subscriptions", icon: CheckCircle2 },
  { key: "trialsExpiringSoon", label: "Trials expiring soon", icon: AlertTriangle },
  { key: "provisioningFailures", label: "Provisioning failures", icon: Activity },
] as const;

export function AdminOverview() {
  const summaryQuery = useQuery({
    queryKey: ["admin", "summary"],
    queryFn: () => adminClient.summary(),
  });

  if (summaryQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  const summary = summaryQuery.data;

  if (summaryQuery.isError || !summary) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Failed to load the platform summary. Please try again.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform-wide health and activity across all companies and tenants.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          const value = summary[card.key];
          return (
            <Card key={card.key}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">{value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tenants by status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(summary.tenantsByStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{status.toLowerCase()}</span>
                <span className="font-medium tabular-nums">{count}</span>
              </div>
            ))}
            {Object.keys(summary.tenantsByStatus).length === 0 ? (
              <p className="text-sm text-muted-foreground">No tenants yet.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tenants by plan tier</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(summary.tenantsByTier).map(([tier, count]) => (
              <div key={tier} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{tier.toLowerCase()}</span>
                <span className="font-medium tabular-nums">{count}</span>
              </div>
            ))}
            {Object.keys(summary.tenantsByTier).length === 0 ? (
              <p className="text-sm text-muted-foreground">No tenants yet.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-base">Recent tenants</CardTitle>
            <CardDescription>The latest tenants to sign up or provision.</CardDescription>
          </div>
          <Link href="/admin/tenants" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.recentTenants.map((tenant) => (
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
                  <TableCell>{tenant.ownerEmail ?? "—"}</TableCell>
                  <TableCell>{formatDate(tenant.createdAt)}</TableCell>
                </TableRow>
              ))}
              {summary.recentTenants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">
                    No tenants yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
