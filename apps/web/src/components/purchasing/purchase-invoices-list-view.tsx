"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@amni/ui";
import { getPurchaseInvoices } from "@/src/lib/purchasing";
import { PanelError } from "@/src/components/dashboard/panel-utils";
import { PurchaseInvoicesTable } from "./purchase-invoices-table";

export function PurchaseInvoicesListView() {
  const query = useQuery({
    queryKey: ["purchasing", "purchase-invoices"],
    queryFn: getPurchaseInvoices,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Purchase invoices</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Supplier bills and what&apos;s still owed.
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          {query.isError ? (
            <PanelError onRetry={() => void query.refetch()} />
          ) : (
            <PurchaseInvoicesTable data={query.data?.items ?? []} loading={query.isLoading} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
