import { Injectable } from "@nestjs/common";
import { FINANCE_DOCTYPE, PURCHASING_DOCTYPE } from "@amni/erp";
import type {
  FinanceArBucket,
  FinanceOverview,
  FinanceSeriesPoint,
  FinancialReport,
  ReportRow,
  ReportType,
} from "@amni/shared";

import type { GatewayRequestMeta, GatewayUser } from "../erp-gateway/erp-gateway.service";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ErpGatewayService } from "../erp-gateway/erp-gateway.service";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const KPI_CUR = { format: "currency" as const, currency: "USD" as const };

interface SimpleInvoice {
  total: number;
  outstanding: number;
  dueDate: Date;
  postingDate: Date;
  submitted: boolean;
}

interface SimplePayment {
  amount: number;
  postingDate: Date;
  submitted: boolean;
  incoming: boolean;
}

interface SimpleExpense {
  total: number;
  postingDate: Date;
  submitted: boolean;
}

const INVOICE_FIELDS = ["name", "grand_total", "outstanding_amount", "posting_date", "due_date", "docstatus"];
const PAYMENT_FIELDS = ["name", "payment_type", "paid_amount", "received_amount", "posting_date", "docstatus"];
const EXPENSE_FIELDS = ["name", "grand_total", "posting_date", "docstatus"];

function monthKey(date: Date): number {
  return date.getFullYear() * 12 + date.getMonth();
}

function monthsBack(count: number): { key: number; label: string }[] {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1);
    return { key: monthKey(date), label: months[date.getMonth()] ?? "" };
  });
}

function bucketLabel(days: number): string {
  if (days <= 0) return "Current";
  if (days <= 30) return "1–30";
  if (days <= 60) return "31–60";
  if (days <= 90) return "61–90";
  return "90+";
}

function toInvoice(doc: Record<string, unknown>): SimpleInvoice {
  return {
    total: Number(doc.grand_total ?? 0),
    outstanding: Number(doc.outstanding_amount ?? doc.grand_total ?? 0),
    dueDate: new Date(String(doc.due_date ?? doc.posting_date ?? Date.now())),
    postingDate: new Date(String(doc.posting_date ?? Date.now())),
    submitted: Number(doc.docstatus ?? 0) === 1,
  };
}

function toPayment(doc: Record<string, unknown>): SimplePayment {
  const incoming = String(doc.payment_type ?? "") === "Receive";
  return {
    amount: Number(incoming ? (doc.received_amount ?? doc.paid_amount) : (doc.paid_amount ?? doc.received_amount)) || 0,
    postingDate: new Date(String(doc.posting_date ?? Date.now())),
    submitted: Number(doc.docstatus ?? 0) === 1,
    incoming,
  };
}

function toExpense(doc: Record<string, unknown>): SimpleExpense {
  return {
    total: Number(doc.grand_total ?? 0),
    postingDate: new Date(String(doc.posting_date ?? Date.now())),
    submitted: Number(doc.docstatus ?? 0) === 1,
  };
}

function aging(invoices: SimpleInvoice[]): FinanceArBucket[] {
  const labels = ["Current", "1–30", "31–60", "61–90", "90+"];
  const now = Date.now();
  return labels.map((label) => {
    const value = invoices.reduce((sum, invoice) => {
      const overdueDays = Math.ceil((now - invoice.dueDate.getTime()) / 86_400_000);
      if (bucketLabel(overdueDays) !== label) return sum;
      return sum + invoice.outstanding;
    }, 0);
    return { label, value: Math.round(value * 100) / 100 };
  });
}

function toAgingRow(bucket: FinanceArBucket): ReportRow {
  return { account: bucket.label === "Current" ? "Current" : `${bucket.label} days`, amount: bucket.value };
}

/**
 * Finance dashboard surface over the tenant's real ERPNext site (M5-006).
 * Aggregation stays in-app (matching the list conventions of the M5-005
 * modules): overview and aging reports derive from submitted Sales Invoices,
 * Purchase Invoices, Payment Entries and Expense Claims; statement reports
 * are computed summaries of the same doctypes. Contract shapes are unchanged.
 */
@Injectable()
export class FinanceService {
  constructor(private readonly gateway: ErpGatewayService) {}

  async overview(user: GatewayUser, meta: GatewayRequestMeta): Promise<FinanceOverview> {
    const { salesInvoices, purchaseInvoices, payments, expenses } = await this.fetchAll(user, meta);
    const now = new Date();

    const revenue = sumSubmitted(salesInvoices, (invoice) => invoice.total);
    const ar = sumSubmitted(salesInvoices, (invoice) => invoice.outstanding);
    const ap = sumSubmitted(purchaseInvoices, (invoice) => invoice.outstanding);
    const cash = payments
      .filter((payment) => payment.submitted)
      .reduce((sum, payment) => sum + (payment.incoming ? payment.amount : -payment.amount), 0);
    const invoiced = salesInvoices.filter((invoice) => invoice.submitted);
    const bills = purchaseInvoices.filter((invoice) => invoice.submitted);

    const buckets = monthsBack(12);
    const revenueByMonth = new Map<number, number>();
    const expensesByMonth = new Map<number, number>();
    for (const invoice of invoiced) revenueByMonth.set(monthKey(invoice.postingDate), (revenueByMonth.get(monthKey(invoice.postingDate)) ?? 0) + invoice.total);
    for (const expense of expenses.filter((entry) => entry.submitted))
      expensesByMonth.set(monthKey(expense.postingDate), (expensesByMonth.get(monthKey(expense.postingDate)) ?? 0) + expense.total);

    const revenueTrend = buckets.map((bucket) => ({ label: bucket.label, value: Math.round(revenueByMonth.get(bucket.key) ?? 0) }));
    const expensesTrend = buckets.map((bucket) => ({ label: bucket.label, value: Math.round(expensesByMonth.get(bucket.key) ?? 0) }));
    const cashTrend = seriesFrom(cashByMonth(payments, buckets));
    const monthlyTotals = buckets.map((bucket) => {
      const revenue = revenueByMonth.get(bucket.key) ?? 0;
      const expenses = expensesByMonth.get(bucket.key) ?? 0;
      return { month: bucket.label, revenue, expenses, profit: revenue - expenses };
    });

    return {
      asOf: now.toISOString(),
      kpis: [
        { id: "revenue", label: "Revenue", value: Math.round(revenue), ...KPI_CUR, hint: `${invoiced.length} invoices this period` },
        { id: "ar", label: "Accounts receivable", value: Math.round(ar), ...KPI_CUR, hint: `${invoiced.length} invoices outstanding` },
        { id: "ap", label: "Accounts payable", value: Math.round(ap), ...KPI_CUR, hint: `${bills.length} bills outstanding` },
        { id: "cash", label: "Cash balance", value: Math.round(cash), ...KPI_CUR, hint: "net of payment entries" },
      ],
      revenueTrend,
      cashTrend,
      expensesTrend,
      arAging: aging(invoiced),
      apAging: aging(bills),
      monthlyTotals,
    };
  }

  async report(user: GatewayUser, meta: GatewayRequestMeta, type: ReportType): Promise<FinancialReport> {
    const { salesInvoices, purchaseInvoices, payments, expenses } = await this.fetchAll(user, meta);
    const now = new Date();
    const invoiced = salesInvoices.filter((invoice) => invoice.submitted);
    const bills = purchaseInvoices.filter((invoice) => invoice.submitted);
    const expenseTotal = sumSubmitted(expenses, (expense) => expense.total);
    const revenue = sumSubmitted(salesInvoices, (invoice) => invoice.total);
    const ar = sumSubmitted(salesInvoices, (invoice) => invoice.outstanding);
    const ap = sumSubmitted(purchaseInvoices, (invoice) => invoice.outstanding);
    const cash = payments
      .filter((payment) => payment.submitted)
      .reduce((sum, payment) => sum + (payment.incoming ? payment.amount : -payment.amount), 0);
    const incoming = payments.filter((payment) => payment.submitted && payment.incoming).reduce((sum, payment) => sum + payment.amount, 0);
    const outgoing = payments.filter((payment) => payment.submitted && !payment.incoming).reduce((sum, payment) => sum + payment.amount, 0);

    const rowsByType: Record<ReportType, ReportRow[]> = {
      income_statement: [
        { account: "Sales revenue", amount: Math.round(revenue) },
        { account: "Expenses", amount: -Math.round(expenseTotal) },
        { account: "Net income", amount: Math.round(revenue - expenseTotal) },
      ],
      balance_sheet: [
        { account: "Current assets (cash + receivables)", amount: Math.round(cash + ar) },
        { account: "Total assets", amount: Math.round(cash + ar) },
        { account: "Accounts payable", amount: Math.round(ap) },
        { account: "Total liabilities", amount: Math.round(ap) },
        { account: "Owner's equity", amount: Math.round(cash + ar - ap) },
        { account: "Total liabilities & equity", amount: Math.round(cash + ar) },
      ],
      cash_flow: [
        { account: "Cash received", amount: Math.round(incoming) },
        { account: "Cash paid", amount: -Math.round(outgoing) },
        { account: "Net cash flow", amount: Math.round(cash) },
      ],
      ar_aging: aging(invoiced).map(toAgingRow),
      ap_aging: aging(bills).map(toAgingRow),
    };

    const titles: Record<ReportType, string> = {
      income_statement: "Income statement",
      balance_sheet: "Balance sheet",
      cash_flow: "Cash flow statement",
      ar_aging: "Accounts receivable aging",
      ap_aging: "Accounts payable aging",
    };

    const rows = rowsByType[type];
    return {
      title: titles[type],
      period: "Last 12 months",
      currency: "USD",
      rows,
      total: Math.round(rows.reduce((sum, row) => sum + row.amount, 0)),
      generatedAt: now.toISOString(),
    };
  }

  private async fetchAll(user: GatewayUser, meta: GatewayRequestMeta): Promise<{
    salesInvoices: SimpleInvoice[];
    purchaseInvoices: SimpleInvoice[];
    payments: SimplePayment[];
    expenses: SimpleExpense[];
  }> {
    const [sales, purchases, payments, expenses] = await Promise.all([
      this.gateway.list(user, meta, "Sales Invoice", { fields: INVOICE_FIELDS, limitPageLength: 500 }),
      this.gateway.list(user, meta, PURCHASING_DOCTYPE.purchaseInvoice, { fields: INVOICE_FIELDS, limitPageLength: 500 }),
      this.gateway.list(user, meta, FINANCE_DOCTYPE.paymentEntry, { fields: PAYMENT_FIELDS, limitPageLength: 500 }),
      this.gateway.list(user, meta, FINANCE_DOCTYPE.expenseClaim, { fields: EXPENSE_FIELDS, limitPageLength: 500 }),
    ]);
    return {
      salesInvoices: sales.items.map(toInvoice),
      purchaseInvoices: purchases.items.map(toInvoice),
      payments: payments.items.map(toPayment),
      expenses: expenses.items.map(toExpense),
    };
  }
}

function sumSubmitted<T>(records: T[], pick: (record: T) => number): number {
  return records.reduce((sum, record) => sum + pick(record), 0);
}

function cashByMonth(payments: SimplePayment[], buckets: { key: number; label: string }[]): Map<number, number> {
  const byMonth = new Map<number, number>();
  for (const payment of payments.filter((entry) => entry.submitted))
    byMonth.set(monthKey(payment.postingDate), (byMonth.get(monthKey(payment.postingDate)) ?? 0) + (payment.incoming ? payment.amount : -payment.amount));
  const out = new Map<number, number>();
  let running = 0;
  for (const bucket of buckets) {
    running += byMonth.get(bucket.key) ?? 0;
    out.set(bucket.key, running);
  }
  return out;
}

function seriesFrom(values: Map<number, number>): FinanceSeriesPoint[] {
  return monthsBack(12).map((bucket) => ({ label: bucket.label, value: Math.round(values.get(bucket.key) ?? 0) }));
}
