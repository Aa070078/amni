"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CreditCard, Loader2 } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@amni/ui";
import { formatCurrency } from "@/src/lib/format";
import { settingsClient } from "@/src/lib/settings";

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "success" | "destructive"> = {
  active: "success",
  trial: "default",
  past_due: "destructive",
  cancelled: "secondary",
};

export function PlanView() {
  const queryClient = useQueryClient();

  const planQuery = useQuery({
    queryKey: ["settings", "plan"],
    queryFn: () => settingsClient.plan(),
  });

  const billingMutation = useMutation({
    mutationFn: (billingPeriod: "monthly" | "yearly") => settingsClient.changeBilling({ billingPeriod }),
    onSuccess: (data) => queryClient.setQueryData(["settings", "plan"], data),
  });

  if (planQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const plan = planQuery.data;
  if (!plan) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Billing information is unavailable right now.
        </CardContent>
      </Card>
    );
  }

  const isYearly = plan.billingPeriod === "yearly";
  const price = isYearly ? plan.plan.priceYearly : plan.plan.priceMonthly;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              {plan.plan.name}
              <Badge variant={STATUS_VARIANTS[plan.status] ?? "secondary"}>{plan.status}</Badge>
            </CardTitle>
            <CardDescription>
              {plan.seatsUsed} of {plan.plan.seats} seats used · {plan.plan.storageGb} GB storage
            </CardDescription>
          </div>
          <p className="text-2xl font-semibold tabular-nums">
            {formatCurrency(price, "USD")}
            <span className="text-sm font-normal text-muted-foreground">/{isYearly ? "yr" : "mo"}</span>
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            {plan.plan.features.map((feature) => (
              <p key={feature} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                {feature}
              </p>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t pt-4">
            <div className="inline-flex items-center rounded-md border p-0.5">
              <Button
                variant={!isYearly ? "default" : "ghost"}
                size="sm"
                onClick={() => !isYearly || billingMutation.mutate("monthly")}
              >
                Monthly
              </Button>
              <Button
                variant={isYearly ? "default" : "ghost"}
                size="sm"
                onClick={() => isYearly || billingMutation.mutate("yearly")}
              >
                Yearly (2 months free)
              </Button>
            </div>
            {billingMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
            ) : (
              <p className="text-sm text-muted-foreground">
                Next payment {new Date(plan.nextPayment?.date ?? plan.renewsAt).toLocaleDateString()} ·{" "}
                {formatCurrency(plan.nextPayment?.amount ?? price, plan.nextPayment?.currency ?? "USD")}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Billing history
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plan.invoices.map((invoice) => (
                <TableRow key={invoice.code}>
                  <TableCell className="font-medium tabular-nums">{invoice.code}</TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {new Date(invoice.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="tabular-nums">{formatCurrency(invoice.amount, invoice.currency)}</TableCell>
                  <TableCell>
                    <Badge variant={invoice.status === "paid" ? "success" : invoice.status === "pending" ? "outline" : "destructive"}>
                      {invoice.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
