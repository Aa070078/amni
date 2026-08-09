"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowUpRight,
  Banknote,
  CalendarDays,
  FileText,
  Loader2,
  Sparkles,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import type { FinanceArBucket, FinanceSeriesPoint, FinancialReport, ReportType } from "@amni/shared";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from "@amni/ui";
import { AreaChart } from "@/src/components/dashboard/area-chart";
import { KpiGrid } from "@/src/components/dashboard/kpi-grid";
import { PanelEmpty, PanelError } from "@/src/components/dashboard/panel-utils";
import { formatCurrency, formatRelativeTime } from "@/src/lib/format";
import { financeClient } from "@/src/lib/finance";

const CURRENCY = "USD";

const REPORT_OPTIONS: { type: ReportType; label: string }[] = [
  { type: "income_statement", label: "Income statement" },
  { type: "balance_sheet", label: "Balance sheet" },
  { type: "cash_flow", label: "Cash flow" },
  { type: "ar_aging", label: "Receivables aging" },
  { type: "ap_aging", label: "Payables aging" },
];

function OverviewHeader() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Finance</h1>
        <p className="mt-1 text-sm text-muted-foreground">Overview, reports, expenses, and payments.</p>
      </div>
      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/finance/expenses">Expenses</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/finance/payments">Payments</Link>
        </Button>
      </div>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-56 rounded-lg lg:col-span-2" />
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-44 rounded-lg lg:col-span-2" />
        <Skeleton className="h-44 rounded-lg" />
      </div>
    </div>
  );
}

function AgingBarList({ buckets }: { buckets: FinanceArBucket[] }) {
  const max = buckets.reduce((highest, bucket) => Math.max(highest, bucket.value), 0);
  if (buckets.length === 0) {
    return <p className="text-sm text-muted-foreground">No aging buckets yet.</p>;
  }
  return (
    <ul className="space-y-4">
      {buckets.map((bucket) => {
        const share = max > 0 ? (bucket.value / max) * 100 : 0;
        return (
          <li key={bucket.label} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="text-muted-foreground">{bucket.label}</span>
              <span className="font-medium tabular-nums text-foreground">
                {formatCurrency(bucket.value, CURRENCY)}
              </span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label={`${bucket.label}: ${formatCurrency(bucket.value, CURRENCY)}`}
            >
              <div className="h-full rounded-full bg-primary" style={{ width: `${share}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function TrendCard({
  icon: Icon,
  title,
  data,
  ariaLabel,
}: {
  icon: LucideIcon;
  title: string;
  data: FinanceSeriesPoint[];
  ariaLabel: string;
}) {
  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <AreaChart data={data} ariaLabel={ariaLabel} formatValue={(value) => formatCurrency(value, CURRENCY)} />
      </CardContent>
    </Card>
  );
}

function AgingCard({ title, buckets }: { title: string; buckets: FinanceArBucket[] }) {
  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Banknote className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <AgingBarList buckets={buckets} />
      </CardContent>
    </Card>
  );
}

function ReportDialog({ report, onClose }: { report: FinancialReport | null; onClose: () => void }) {
  return (
    <Dialog
      open={report !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        {report ? (
          <>
            <DialogHeader>
              <DialogTitle>{report.title}</DialogTitle>
              <DialogDescription>
                {report.period} · Generated {new Date(report.generatedAt).toLocaleString()}
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead className="w-32 text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.rows.map((row) => (
                    <TableRow key={row.account}>
                      <TableCell className="text-foreground">{row.account}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums text-foreground">
                        {formatCurrency(row.amount, report.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell className="font-medium text-foreground">Total</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-foreground">
                      {formatCurrency(report.total, report.currency)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function FinanceOverviewView() {
  const [activeReport, setActiveReport] = useState<FinancialReport | null>(null);

  const overviewQuery = useQuery({
    queryKey: ["finance", "overview"],
    queryFn: () => financeClient.overview(),
  });

  const reportMutation = useMutation({
    mutationFn: (type: ReportType) => financeClient.report(type),
    onSuccess: (report) => setActiveReport(report),
  });

  if (overviewQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-40" />
        <OverviewSkeleton />
      </div>
    );
  }

  if (overviewQuery.isError) {
    return (
      <Card>
        <CardContent className="p-6">
          <PanelError onRetry={() => void overviewQuery.refetch()} />
        </CardContent>
      </Card>
    );
  }

  const overview = overviewQuery.data;
  if (!overview) return null;

  if (overview.kpis.length === 0) {
    return (
      <div className="space-y-6">
        <OverviewHeader />
        <Card>
          <CardContent className="p-6">
            <PanelEmpty
              icon={Sparkles}
              title="No finance metrics yet"
              description="Your key numbers will show here once your workspace has transactions."
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <OverviewHeader />

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
        Data as of {formatRelativeTime(overview.asOf)}
      </p>

      <KpiGrid kpis={overview.kpis} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TrendCard
            icon={ArrowUpRight}
            title="Revenue trend"
            data={overview.revenueTrend}
            ariaLabel="Revenue over time"
          />
        </div>
        <TrendCard icon={Wallet} title="Cash position" data={overview.cashTrend} ariaLabel="Cash balance over time" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AgingCard title="Receivables aging" buckets={overview.arAging} />
        <AgingCard title="Payables aging" buckets={overview.apAging} />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Monthly totals
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {overview.monthlyTotals.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.monthlyTotals.map((row) => (
                  <TableRow key={row.month}>
                    <TableCell className="font-medium text-foreground">{row.month}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatCurrency(row.revenue, CURRENCY)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatCurrency(row.expenses, CURRENCY)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-medium tabular-nums",
                        row.profit < 0 ? "text-destructive" : "text-foreground",
                      )}
                    >
                      {formatCurrency(row.profit, CURRENCY)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="px-6 pb-6 text-sm text-muted-foreground">No monthly totals yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Reports
          </CardTitle>
          <CardDescription>Generate financial statements on demand.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {REPORT_OPTIONS.map((option) => (
              <Button
                key={option.type}
                variant="outline"
                disabled={reportMutation.isPending}
                onClick={() => reportMutation.mutate(option.type)}
              >
                {option.label}
              </Button>
            ))}
          </div>
          {reportMutation.isPending ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground" role="status">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Generating report…
            </p>
          ) : null}
        </CardContent>
      </Card>

      <ReportDialog
        report={activeReport}
        onClose={() => {
          setActiveReport(null);
          reportMutation.reset();
        }}
      />
    </div>
  );
}
