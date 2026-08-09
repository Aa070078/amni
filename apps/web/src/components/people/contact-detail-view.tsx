"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, Building2, Mail, MapPin, Phone, StickyNote, UserRound } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from "@amni/ui";
import type { ContactStatus } from "@amni/shared";
import { getContact } from "@/src/lib/people";
import { contactStatusBadge, contactStatusLabel } from "@/src/lib/people";
import { formatDate } from "@/src/lib/format";
import { PanelError } from "@/src/components/dashboard/panel-utils";

function StatusBadge({ status }: { status: ContactStatus }) {
  return <Badge variant={contactStatusBadge[status]}>{contactStatusLabel(status)}</Badge>;
}

function initials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

function DetailSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-40 rounded-lg lg:col-span-2" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
    </div>
  );
}

export function ContactDetailView({ id }: { id: string }) {
  const query = useQuery({
    queryKey: ["people", "contact", id],
    queryFn: () => getContact(id),
  });

  if (query.isLoading) {
    return <DetailSkeleton />;
  }

  if (query.isError || !query.data) {
    return <PanelError onRetry={() => void query.refetch()} />;
  }

  const contact = query.data;
  const fullName = `${contact.firstName} ${contact.lastName}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/people/contacts">
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Contacts
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <Avatar className="h-11 w-11">
              <AvatarFallback>{initials(contact.firstName, contact.lastName)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <span className="flex items-center gap-2">
                  <UserRound className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  {fullName}
                </span>
                <StatusBadge status={contact.status} />
              </CardTitle>
              <CardDescription className="mt-0.5">
                {[contact.title, contact.department].filter(Boolean).join(" · ") || "Contact"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <div className="space-y-3">
            {contact.email ? (
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                  {contact.email}
                </a>
              </p>
            ) : null}
            {contact.phone ? (
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                {contact.phone}
              </p>
            ) : null}
          </div>
          <div className="space-y-3">
            {contact.company ? (
              <p className="flex items-center gap-2">
                <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                {contact.company}
              </p>
            ) : null}
            {contact.location ? (
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                {contact.location}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <StickyNote className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {contact.notes ? (
              <p>{contact.notes}</p>
            ) : (
              <p className="text-muted-foreground">No notes on file.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Member since</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>{formatDate(contact.createdAt)}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
