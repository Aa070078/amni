"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Banknote,
  Building2,
  Globe,
  Landmark,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  UserRound,
  Users,
} from "lucide-react";
import { ORGANIZATION_INDUSTRIES, ORGANIZATION_STATUSES, type OrganizationStatus } from "@amni/shared";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@amni/ui";
import { AmniApiError } from "@/src/lib/client";
import { crmClient, formatCrmDateTime } from "@/src/lib/crm";
import { formatCurrency, formatNumber } from "@/src/lib/format";
import { OrgStatusBadge } from "../crm-badges";
import { ActivityTimeline } from "../activity-timeline";
import { RecordTasksPanel, RecordNotesPanel, RecordEventsPanel, RecordCallsPanel, RecordWhatsAppPanel } from "../record-panels";

function industryLabel(value: string | undefined): string {
  return ORGANIZATION_INDUSTRIES.find((entry) => entry.value === value)?.label ?? value ?? "—";
}

interface OrganizationDetailViewProps {
  code: string;
}

export function OrganizationDetailView({ code }: OrganizationDetailViewProps) {
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ["crm", "organizations", "detail", code],
    queryFn: () => crmClient.organizations.detail(code),
    retry: (failureCount, error) => {
      if (error instanceof AmniApiError && error.status === 404) return false;
      return failureCount < 2;
    },
  });

  const contactsQuery = useQuery({
    queryKey: ["crm", "organizations", "contacts", code],
    queryFn: () => crmClient.contacts.list({ organizationCode: code, pageSize: 20 }),
  });

  const updateStatus = useMutation({
    mutationFn: (status: OrganizationStatus) => crmClient.organizations.update(code, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["crm", "organizations", "detail", code] });
      void queryClient.invalidateQueries({ queryKey: ["crm", "organizations"] });
    },
  });

  if (detailQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-32 rounded-lg" />
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
          <Building2 className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-base font-semibold">
              {is404 ? "Company not found" : "Couldn&apos;t load this company"}
            </p>
            <p className="text-sm text-muted-foreground">
              {is404 ? `No company matches ${code}. It may have been removed.` : "Something went wrong. Please try again."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!is404 ? (
              <Button variant="outline" onClick={() => void detailQuery.refetch()}>
                Retry
              </Button>
            ) : null}
            <Button asChild variant={is404 ? "default" : "outline"}>
              <Link href="/crm/organizations">
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Back to companies
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const org = detailQuery.data;
  if (!org) return null;

  return (
    <div className="space-y-6">
      <Link
        href="/crm/organizations"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Companies
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{org.name}</h1>
              <span className="text-sm tabular-nums text-muted-foreground">{org.code}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <OrgStatusBadge status={org.status} />
              <span className="text-sm text-muted-foreground">{industryLabel(org.industry)}</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:items-end">
            <Select
              value={org.status}
              disabled={updateStatus.isPending}
              onValueChange={(value) => updateStatus.mutate(value as OrganizationStatus)}
            >
              <SelectTrigger className="h-8 w-40" aria-label="Status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORGANIZATION_STATUSES.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">Updated {formatCrmDateTime(org.updatedAt)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground">Open deals</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">{formatCurrency(org.openDealValue, "USD")}</p>
                <p className="text-xs text-muted-foreground">{org.dealCount} deals</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground">Contacts</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">{org.contactCount}</p>
                <p className="text-xs text-muted-foreground">linked people</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground">Employees</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {org.employeeCount !== undefined && org.employeeCount !== null ? formatNumber(org.employeeCount) : "—"}
                </p>
                <p className="text-xs text-muted-foreground">{org.territory ?? "—"} territory</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
              <CardDescription>Company information.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <DetailRow icon={Globe} label="Website" value={org.website ?? "—"} />
              <DetailRow icon={Mail} label="Email" value={org.email ?? "—"} />
              <DetailRow icon={Phone} label="Phone" value={org.phone ?? "—"} />
              <DetailRow icon={Linkedin} label="LinkedIn" value={org.linkedin ?? "—"} />
              <DetailRow icon={Banknote} label="Annual revenue" value={formatCurrency(org.annualRevenue ?? 0, "USD")} />
              <DetailRow icon={UserRound} label="Owner" value={org.owner ?? "—"} />
              {org.address ? (
                <DetailRow
                  icon={MapPin}
                  label="Address"
                  value={[org.address.addressLine1, org.address.addressLine2, org.address.city, org.address.state, org.address.zip, org.address.country]
                    .filter(Boolean)
                    .join(", ")}
                />
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Contacts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {contactsQuery.isLoading ? (
                <Skeleton className="h-20 rounded-md" />
              ) : contactsQuery.data && contactsQuery.data.items.length > 0 ? (
                <ul className="divide-y">
                  {contactsQuery.data.items.map((contact) => (
                    <li key={contact.code} className="flex items-center justify-between gap-2 py-2">
                      <Link
                        href={`/crm/contacts/${contact.code}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {contact.firstName} {contact.lastName}
                      </Link>
                      <span className="flex items-center gap-3 text-xs text-muted-foreground">
                        {contact.jobTitle ? <span>{contact.jobTitle}</span> : null}
                        <span className="tabular-nums">{contact.code}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
                  No contacts linked to this company yet.
                </p>
              )}
            </CardContent>
          </Card>

          {org.notes ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Landmark className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{org.notes}</p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTimeline referenceType="organization" referenceCode={code} />
            </CardContent>
          </Card>

          <RecordTasksPanel referenceType="organization" referenceCode={code} />
          <RecordNotesPanel referenceType="organization" referenceCode={code} />
          <RecordEventsPanel referenceType="organization" referenceCode={code} />
          <RecordCallsPanel referenceType="organization" referenceCode={code} />
          <RecordWhatsAppPanel referenceType="organization" referenceCode={code} />
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
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
