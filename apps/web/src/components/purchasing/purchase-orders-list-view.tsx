"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@amni/ui";
import { getPurchaseOrders } from "@/src/lib/purchasing";
import { PanelError } from "@/src/components/dashboard/panel-utils";
import { PurchaseOrdersTable } from "./purchase-orders-table";

export function PurchaseOrdersListView() {
  const query = useQuery({
    queryKey: ["purchasing", "purchase-orders"],
    queryFn: getPurchaseOrders,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Purchase orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Order stock and services from your suppliers.
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          {query.isError ? (
            <PanelError onRetry={() => void query.refetch()} />
          ) : (
            <PurchaseOrdersTable data={query.data?.items ?? []} loading={query.isLoading} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
