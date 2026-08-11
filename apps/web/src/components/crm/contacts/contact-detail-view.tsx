"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, Mail, MapPin, Phone, UserRound } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from "@amni/ui";
import { AmniApiError } from "@/src/lib/client";
import { crmClient, formatCrmDateTime } from "@/src/lib/crm";
import { ActivityTimeline } from "../activity-timeline";
import { RecordTasksPanel, RecordNotesPanel, RecordEventsPanel, RecordCallsPanel, RecordWhatsAppPanel } from "../record-panels";

interface ContactDetailViewProps {
  code: string;
}

export function ContactDetailView({ code }: ContactDetailViewProps) {
  const detailQuery = useQuery({
    queryKey: ["crm", "contacts", "detail", code],
    queryFn: () => crmClient.contacts.detail(code),
    retry: (failureCount, error) => {
      if (error instanceof AmniApiError && error.status === 404) return false;
      return failureCount < 2;
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
          <UserRound className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-base font-semibold">
              {is404 ? "Contact not found" : "Couldn&apos;t load this contact"}
            </p>
            <p className="text-sm text-muted-foreground">
              {is404 ? `No contact matches ${code}. It may have been removed.` : "Something went wrong. Please try again."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!is404 ? (
              <Button variant="outline" onClick={() => void detailQuery.refetch()}>
                Retry
              </Button>
            ) : null}
            <Button asChild variant={is404 ? "default" : "outline"}>
              <Link href="/sales/crm/contacts">
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Back to contacts
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const contact = detailQuery.data;
  if (!contact) return null;

  const name = `${contact.firstName} ${contact.lastName ?? ""}`.trim();

  return (
    <div className="space-y-6">
      <Link
        href="/sales/crm/contacts"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Contacts
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{name}</h1>
              <span className="text-sm tabular-nums text-muted-foreground">{contact.code}</span>
              {contact.isPrimary ? <Badge variant="success">Primary</Badge> : null}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {contact.jobTitle ? <span>{contact.jobTitle}</span> : null}
              {contact.department ? <span>· {contact.department}</span> : null}
              {contact.company ? (
                <span>
                  ·{" "}
                  {contact.organizationCode ? (
                    <Link
                      href={`/sales/crm/organizations/${contact.organizationCode}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {contact.company}
                    </Link>
                  ) : (
                    contact.company
                  )}
                </span>
              ) : null}
            </div>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            Added {formatCrmDateTime(contact.createdAt)}
          </span>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
              <CardDescription>Contact information.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <DetailRow icon={Mail} label="Email" value={contact.email ?? "—"} />
              <DetailRow icon={Phone} label="Mobile" value={contact.mobileNo ?? "—"} />
              <DetailRow icon={MapPin} label="Address" value={contact.address ?? "—"} />
              <DetailRow
                icon={Building2}
                label="Company"
                value={contact.company ?? "—"}
              />
            </CardContent>
          </Card>

          {contact.notes ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{contact.notes}</p>
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
              <ActivityTimeline referenceType="contact" referenceCode={code} />
            </CardContent>
          </Card>

          <RecordTasksPanel referenceType="contact" referenceCode={code} />
          <RecordNotesPanel referenceType="contact" referenceCode={code} />
          <RecordEventsPanel referenceType="contact" referenceCode={code} />
          <RecordCallsPanel referenceType="contact" referenceCode={code} />
          <RecordWhatsAppPanel referenceType="contact" referenceCode={code} />
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: string }) {
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
