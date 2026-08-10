"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { LegacyColumnDef } from "@tanstack/react-table/legacy";
import { CheckCircle2, Mail, Search, TrendingUp, Users } from "lucide-react";
import type { Contact } from "@amni/shared";
import {
  Button,
  Card,
  CardContent,
  DataTable,
  DataTableColumnHeader,
  Skeleton,
} from "@amni/ui";
import { contactsClient } from "@/src/lib/contacts";
import { NewContactDialog } from "./new-contact-dialog";
import { ContactStatusBadge } from "./contact-status";

export function contactFullName(contact: Pick<Contact, "firstName" | "lastName">): string {
  return [contact.firstName, contact.lastName].filter(Boolean).join(" ");
}

const LIST_COLUMNS: LegacyColumnDef<Contact>[] = [
  {
    accessorKey: "code",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Contact" />,
    cell: ({ row }) => {
      const contact = row.original;
      return (
        <Link
          href={`/people/contacts/${contact.code}`}
          className="font-medium tabular-nums text-foreground hover:text-primary hover:underline"
        >
          {contact.code}
        </Link>
      );
    },
  },
  {
    accessorKey: "firstName",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => <span className="text-foreground">{contactFullName(row.original)}</span>,
  },
  {
    accessorKey: "jobTitle",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Job title" />,
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.jobTitle ?? "—"}</span>
    ),
  },
  {
    accessorKey: "company",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Company" />,
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.company ?? "—"}</span>
    ),
  },
  {
    accessorKey: "email",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.email ?? "—"}</span>,
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => <ContactStatusBadge status={row.original.status} />,
  },
];

export function ContactsView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createdContact, setCreatedContact] = useState<Contact | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!createdContact) return;
    const timer = setTimeout(() => setCreatedContact(null), 5000);
    return () => clearTimeout(timer);
  }, [createdContact]);

  const listQuery = useQuery({
    queryKey: ["contacts", "list", debouncedSearch],
    queryFn: () =>
      contactsClient.list({
        page: 1,
        pageSize: 100,
        sortBy: "createdAt",
        sortDir: "desc",
        q: debouncedSearch.trim() || undefined,
      }),
    placeholderData: (previous) => previous,
  });

  const createContact = (contact: Contact) => {
    setCreatedContact(contact);
    void queryClient.invalidateQueries({ queryKey: ["contacts", "list"] });
  };

  const data = listQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            People you work with — your team, partners and external contacts.
          </p>
        </div>
        <NewContactDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreate={createContact} />
      </div>

      {createdContact ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Created{" "}
            <Link
              href={`/people/contacts/${createdContact.code}`}
              className="font-semibold underline underline-offset-2"
            >
              {createdContact.code}
            </Link>{" "}
            for {contactFullName(createdContact)}.
          </span>
        </div>
      ) : null}

      {listQuery.isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <TrendingUp className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-base font-semibold">Couldn&apos;t load your contacts</p>
              <p className="text-sm text-muted-foreground">
                Something went wrong fetching your contacts. Please try again.
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
                {debouncedSearch ? "No matching contacts" : "No contacts yet"}
              </p>
              <p className="text-sm text-muted-foreground">
                {debouncedSearch
                  ? "Try adjusting your search."
                  : "Add your first contact to your address book."}
              </p>
            </div>
            {debouncedSearch ? (
              <Button variant="outline" onClick={() => setSearch("")}>
                Clear search
              </Button>
            ) : (
              <Button onClick={() => setDialogOpen(true)}>New contact</Button>
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
              placeholder="Search contacts…"
              aria-label="Search contacts"
              className="h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-sm"
            />
          </div>

          <DataTable
            columns={LIST_COLUMNS}
            data={data.items}
            searchable
            globalSearchPlaceholder="Search contacts…"
            getRowId={(contact) => (contact as Contact).code}
            initialSorting={[{ id: "firstName", desc: false }]}
            emptyState={{
              icon: <Users className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
              title: "No contacts yet",
              description: "Add your first contact to your address book.",
            }}
            noResultsState={{
              icon: <Mail className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
              title: "No matching contacts",
              description: "Try adjusting your search or clear the filters.",
            }}
          />
        </>
      )}
    </div>
  );
}
