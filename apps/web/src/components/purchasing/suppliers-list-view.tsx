"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@amni/ui";
import { getSuppliers } from "@/src/lib/purchasing";
import { PanelError } from "@/src/components/dashboard/panel-utils";
import { SuppliersTable } from "./suppliers-table";

export function SuppliersListView() {
  const query = useQuery({
    queryKey: ["purchasing", "suppliers"],
    queryFn: getSuppliers,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Suppliers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage the vendors you buy from.
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          {query.isError ? (
            <PanelError onRetry={() => void query.refetch()} />
          ) : (
            <SuppliersTable data={query.data?.items ?? []} loading={query.isLoading} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
