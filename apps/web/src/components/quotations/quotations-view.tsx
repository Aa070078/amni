"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileText, Search, TrendingUp } from "lucide-react";
import { type Quotation, type QuotationStatus } from "@amni/shared";
import { Button, Card, CardContent, Skeleton } from "@amni/ui";
import { formatCurrency } from "@/src/lib/format";
import { quotationsClient } from "@/src/lib/quotations";
import { NewQuotationDialog } from "./new-quotation-dialog";
import { QuotationsTable } from "./quotations-table";

const OPEN_STATUSES: QuotationStatus[] = ["draft", "sent"];
const WON_STATUSES: QuotationStatus[] = ["accepted", "converted"];
const LOST_STATUSES: QuotationStatus[] = ["rejected", "expired"];

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-xl font-semibold tabular-nums tracking-tight">{value}</span>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </CardContent>
    </Card>
  );
}

export function QuotationsView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createdQuotation, setCreatedQuotation] = useState<Quotation | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!createdQuotation) return;
    const timer = setTimeout(() => setCreatedQuotation(null), 5000);
    return () => clearTimeout(timer);
  }, [createdQuotation]);

  const listQuery = useQuery({
    queryKey: ["quotations", "list", debouncedSearch],
    queryFn: () => quotationsClient.list({ page: 1, pageSize: 100, q: debouncedSearch.trim() || undefined }),
    placeholderData: (previous) => previous,
  });

  const createQuotation = (quotation: Quotation) => {
    setCreatedQuotation(quotation);
    void queryClient.invalidateQueries({ queryKey: ["quotations", "list"] });
  };

  const data = listQuery.data;
  const items = data?.items ?? [];

  const pendingItems = items.filter((quotation) => OPEN_STATUSES.includes(quotation.status));
  const pendingValue = pendingItems.reduce((sum, quotation) => sum + quotation.summary.total, 0);
  const wonItems = items.filter((quotation) => WON_STATUSES.includes(quotation.status));
  const wonValue = wonItems.reduce((sum, quotation) => sum + quotation.summary.total, 0);
  const wonCount = wonItems.length;
  const lostCount = items.filter((quotation) => LOST_STATUSES.includes(quotation.status)).length;
  const closedCount = wonCount + lostCount;
  const conversionRate = closedCount > 0 ? Math.round((wonCount / closedCount) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Quotations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Draft, send, and track quotes through to accepted orders.
          </p>
        </div>
        <NewQuotationDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onCreate={(quotation) => createQuotation(quotation)}
        />
      </div>

      {createdQuotation ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Created{" "}
            <Link
              href={`/sales/quotations/${createdQuotation.code}`}
              className="font-semibold underline underline-offset-2"
            >
              {createdQuotation.code}
            </Link>{" "}
            for {createdQuotation.customer.name}.
          </span>
        </div>
      ) : null}

      {listQuery.isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <TrendingUp className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-base font-semibold">Couldn&apos;t load your quotations</p>
              <p className="text-sm text-muted-foreground">
                Something went wrong fetching your quotations. Please try again.
              </p>
            </div>
            <Button variant="outline" onClick={() => void listQuery.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : listQuery.isLoading || !data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-20 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-lg" />
        </div>
      ) : items.length === 0 ? (
        debouncedSearch ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
              <Search className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="text-base font-semibold">No matching quotations</p>
                <p className="text-sm text-muted-foreground">Try adjusting your search.</p>
              </div>
              <Button variant="outline" onClick={() => setSearch("")}>
                Clear search
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
              <FileText className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="text-base font-semibold">No quotations yet</p>
                <p className="text-sm text-muted-foreground">
                  Create your first quotation to start quoting your customers.
                </p>
              </div>
              <Button onClick={() => setDialogOpen(true)}>New quotation</Button>
            </CardContent>
          </Card>
        )
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Total quotations" value={`${items.length}`} hint="Across all statuses" />
            <StatCard
              label="Pending value"
              value={formatCurrency(pendingValue, "USD")}
              hint={`${pendingItems.length} open quotations`}
            />
            <StatCard
              label="Accepted value"
              value={formatCurrency(wonValue, "USD")}
              hint={`${wonCount} won`}
            />
            <StatCard
              label="Conversion rate"
              value={`${conversionRate}%`}
              hint={`${lostCount} lost`}
            />
          </div>

          <div className="relative">
            <Search
              className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search quotations…"
              aria-label="Search quotations"
              className="h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-sm"
            />
          </div>

          <QuotationsTable data={items} />
        </>
      )}
    </div>
  );
}
