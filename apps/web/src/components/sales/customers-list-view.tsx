"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, TriangleAlert } from "lucide-react";
import { Button, Card, CardContent } from "@amni/ui";
import type { SalesCustomerStatus } from "@amni/shared";
import { getCustomers, updateCustomer } from "@/src/lib/sales";
import { PanelError } from "@/src/components/dashboard/panel-utils";
import { CustomersTable } from "./customers-table";
import { NewCustomerDialog } from "./new-customer-dialog";

export function CustomersListView() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["sales", "customers"],
    queryFn: getCustomers,
  });

  const bulkMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: SalesCustomerStatus }) => {
      setBulkError(null);
      await Promise.all(ids.map((id) => updateCustomer(id, { status })));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sales", "customers"] });
    },
    onError: () => {
      setBulkError("Couldn't update the selected customers. Please try again.");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage the companies and people you sell to.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Add customer
        </Button>
      </div>

      {bulkError ? (
        <p role="alert" className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
          {bulkError}
        </p>
      ) : null}

      <Card>
        <CardContent className="p-4">
          {query.isError ? (
            <PanelError onRetry={() => void query.refetch()} />
          ) : (
            <CustomersTable
              data={query.data?.items ?? []}
              loading={query.isLoading}
              onNewCustomer={() => setDialogOpen(true)}
              bulkActions={(selected) => {
                const allActive = selected.every((customer) => customer.status === "active");
                const allInactive = selected.every((customer) => customer.status === "inactive");
                const ids = selected.map((customer) => customer.id);
                return (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={bulkMutation.isPending || allActive}
                      onClick={() => bulkMutation.mutate({ ids, status: "inactive" })}
                    >
                      Deactivate
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={bulkMutation.isPending || allInactive}
                      onClick={() => bulkMutation.mutate({ ids, status: "active" })}
                    >
                      Activate
                    </Button>
                  </div>
                );
              }}
            />
          )}
        </CardContent>
      </Card>

      <NewCustomerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={() => void queryClient.invalidateQueries({ queryKey: ["sales", "customers"] })}
      />
    </div>
  );
}
