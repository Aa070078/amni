"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@amni/ui";
import { getContacts } from "@/src/lib/people";
import { PanelError } from "@/src/components/dashboard/panel-utils";
import { ContactsTable } from "./contacts-table";

export function ContactsListView() {
  const query = useQuery({
    queryKey: ["people", "contacts"],
    queryFn: getContacts,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The people you work with across your workspace.
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          {query.isError ? (
            <PanelError onRetry={() => void query.refetch()} />
          ) : (
            <ContactsTable data={query.data?.items ?? []} loading={query.isLoading} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
