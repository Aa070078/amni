"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, UserRound } from "lucide-react";
import type { CrmContact } from "@amni/shared";
import { Button, Card, CardContent, Skeleton } from "@amni/ui";
import { crmClient } from "@/src/lib/crm";
import { CrmSectionHeader } from "./crm-nav";
import { ContactsTable } from "./contacts/contacts-table";
import { NewContactDialog } from "./contacts/new-contact-dialog";

export function ContactsView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createdContact, setCreatedContact] = useState<CrmContact | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!createdContact) return;
    const timer = setTimeout(() => setCreatedContact(null), 5000);
    return () => clearTimeout(timer);
  }, [createdContact]);

  const contactsQuery = useQuery({
    queryKey: ["crm", "contacts", { q: debouncedSearch }],
    queryFn: () => crmClient.contacts.list({ q: debouncedSearch.trim() || undefined }),
    placeholderData: (previous) => previous,
  });

  const createContact = useMutation({
    mutationFn: crmClient.contacts.create,
    onSuccess: (contact) => {
      setCreatedContact(contact);
      void queryClient.invalidateQueries({ queryKey: ["crm", "contacts"] });
    },
  });

  return (
    <div className="space-y-6">
      <CrmSectionHeader
        title="Contacts"
        description="Manage the people you work with across every company."
      >
        <NewContactDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onCreate={(contact) => createContact.mutate(contact)}
        />
      </CrmSectionHeader>

      {createdContact ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Created{" "}
            <Link
              href={`/crm/contacts/${createdContact.code}`}
              className="font-semibold underline underline-offset-2"
            >
              {createdContact.code}
            </Link>{" "}
            for {createdContact.firstName} {createdContact.lastName}.
          </span>
        </div>
      ) : null}

      {contactsQuery.isLoading ? (
        <Skeleton className="h-96 rounded-lg" />
      ) : contactsQuery.isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <UserRound className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-base font-semibold">Couldn&apos;t load contacts</p>
              <p className="text-sm text-muted-foreground">Something went wrong. Please try again.</p>
            </div>
            <Button variant="outline" onClick={() => void contactsQuery.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="relative sm:max-w-sm">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search contacts…"
              aria-label="Search contacts"
              className="h-9 w-full rounded-md border border-input bg-transparent pl-3 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <ContactsTable data={contactsQuery.data?.items ?? []} loading={contactsQuery.isFetching} />
        </>
      )}
    </div>
  );
}
