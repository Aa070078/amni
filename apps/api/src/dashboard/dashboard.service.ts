import { Injectable } from "@nestjs/common";
import {
  ProductRole,
  type ActivityItem,
  type DashboardAlerts,
  type DashboardActivity,
  type DashboardArBucket,
  type DashboardKpi,
  type DashboardOverview,
  type DashboardSeriesPoint,
  type DashboardSnapshot,
  type QuickAction,
} from "@amni/shared";
import {
  SALES_DOCTYPE,
  type ErpCustomerDoc,
  type ErpPaymentEntryDoc,
  type ErpQuotationDoc,
  type ErpSalesInvoiceDoc,
  type ErpSalesOrderDoc,
} from "@amni/erp";

import { toIso } from "../common/frappe";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import {
  ErpGatewayService,
  type GatewayRequestMeta,
  type GatewayUser,
} from "../erp-gateway/erp-gateway.service";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { WarehousesService } from "../warehouses/warehouses.service";
import type { StockSummary } from "../warehouses/warehouses.service";

const PRODUCT_ROLES = Object.values(ProductRole) as string[];

export function resolveProductRole(value: unknown): ProductRole | undefined {
  return PRODUCT_ROLES.find((role) => role === value) as ProductRole | undefined;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

/**
 * Accounts payable is intentionally absent here: purchasing / finance is owned
 * by Track B (agent-m5-erp-purch-fin) and will wire it once that lane lands.
 */
const ROLE_KPI_IDS: Record<ProductRole, string[]> = {
  [ProductRole.ADMIN]: ["revenue", "ar", "cash", "inventory"],
  [ProductRole.ACCOUNTANT]: ["revenue", "ar", "cash"],
  [ProductRole.SALES]: ["revenue", "ar"],
  [ProductRole.INVENTORY]: ["inventory"],
  [ProductRole.MEMBER]: ["revenue"],
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "new-sales-order",
    label: "New sales order",
    description: "Create an order and invoice it",
    href: "/sales",
    roles: [ProductRole.SALES, ProductRole.ADMIN],
  },
  {
    id: "new-customer",
    label: "New customer",
    description: "Add a customer record",
    href: "/sales",
    roles: [ProductRole.SALES, ProductRole.ADMIN],
  },
  {
    id: "record-payment",
    label: "Record payment",
    description: "Apply an incoming payment",
    href: "/finance",
    roles: [ProductRole.ACCOUNTANT, ProductRole.ADMIN],
  },
  {
    id: "new-item",
    label: "New item",
    description: "Add a product or service",
    href: "/inventory",
    roles: [ProductRole.INVENTORY, ProductRole.ADMIN],
  },
  {
    id: "new-purchase-order",
    label: "New purchase order",
    description: "Order stock from a supplier",
    href: "/purchasing",
    roles: [ProductRole.INVENTORY, ProductRole.ADMIN],
  },
  {
    id: "financial-report",
    label: "Financial report",
    description: "P&L, balance sheet, cash flow",
    href: "/finance",
    roles: [ProductRole.ACCOUNTANT, ProductRole.ADMIN],
  },
];

type ErpInvoiceRaw = ErpSalesInvoiceDoc & { creation?: string; modified?: string; owner?: string };
type ErpOrderRaw = ErpSalesOrderDoc & { creation?: string; modified?: string; owner?: string };
type ErpQuotationRaw = ErpQuotationDoc & { creation?: string; modified?: string; owner?: string };
type ErpCustomerRaw = ErpCustomerDoc & { creation?: string; modified?: string; owner?: string };
type ErpPaymentRaw = Omit<ErpPaymentEntryDoc, "payment_type"> & {
  payment_type?: "Receive" | "Pay";
};

interface MonthPoint {
  key: string;
  label: string;
}

function lastTwelveMonths(now: Date = new Date()): MonthPoint[] {
  const months: MonthPoint[] = [];
  for (let i = 11; i >= 0; i -= 1) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`,
      label: month.toLocaleString("en-US", { month: "short" }),
    });
  }
  return months;
}

const monthOf = (date?: string): string | undefined => (date ? date.slice(0, 7) : undefined);

const utcDay = (now: Date): number =>
  Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

function buildRevenueKpi(invoices: ErpInvoiceRaw[], months: MonthPoint[]): DashboardKpi {
  const byMonth = new Map<string, number>();
  const current = months[months.length - 1]?.key ?? "";
  const previous = months[months.length - 2]?.key ?? "";
  let currentTotal = 0;
  let previousTotal = 0;
  for (const invoice of invoices) {
    if (invoice.docstatus !== 1) continue;
    const month = monthOf(invoice.posting_date);
    if (!month) continue;
    const total = invoice.grand_total ?? 0;
    byMonth.set(month, (byMonth.get(month) ?? 0) + total);
    if (month === current) currentTotal += total;
    if (month === previous) previousTotal += total;
  }
  const delta =
    previousTotal > 0 ? round2(((currentTotal - previousTotal) / previousTotal) * 100) : 0;
  return {
    id: "revenue",
    label: "Revenue",
    value: round2(currentTotal),
    format: "currency",
    currency: "USD",
    delta,
    deltaLabel: "vs last month",
    trend: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
    hint: "Invoiced this month",
    sparkline: months.map(({ key }) => round2(byMonth.get(key) ?? 0)),
  };
}

function buildArKpi(invoices: ErpInvoiceRaw[], months: MonthPoint[]): DashboardKpi {
  const byMonth = new Map<string, number>();
  let outstanding = 0;
  let count = 0;
  for (const invoice of invoices) {
    if (invoice.docstatus !== 1) continue;
    const amount = invoice.outstanding_amount ?? 0;
    outstanding += amount;
    if (amount > 0) count += 1;
    const month = monthOf(invoice.posting_date);
    if (month) byMonth.set(month, (byMonth.get(month) ?? 0) + amount);
  }
  return {
    id: "ar",
    label: "Accounts receivable",
    value: round2(outstanding),
    format: "currency",
    currency: "USD",
    hint: `${count} ${count === 1 ? "invoice" : "invoices"} outstanding`,
    sparkline: months.map(({ key }) => round2(byMonth.get(key) ?? 0)),
  };
}

function buildCashKpi(payments: ErpPaymentRaw[], months: MonthPoint[]): DashboardKpi {
  const byMonth = new Map<string, number>();
  let entries = 0;
  for (const payment of payments) {
    if (payment.docstatus !== 1) continue;
    entries += 1;
    const month = monthOf(payment.posting_date);
    if (!month) continue;
    const amount = payment.paid_amount ?? 0;
    byMonth.set(
      month,
      (byMonth.get(month) ?? 0) + (payment.payment_type === "Pay" ? -amount : amount),
    );
  }
  const sparkline: number[] = [];
  let running = 0;
  for (const { key } of months) {
    running += byMonth.get(key) ?? 0;
    sparkline.push(round2(running));
  }
  const value = sparkline[sparkline.length - 1] ?? 0;
  const previous = sparkline[sparkline.length - 2] ?? 0;
  const delta = previous > 0 ? round2(((value - previous) / previous) * 100) : 0;
  return {
    id: "cash",
    label: "Cash balance",
    value,
    format: "currency",
    currency: "USD",
    delta,
    deltaLabel: "vs last month",
    trend: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
    hint: `${entries} ${entries === 1 ? "payment entry" : "payment entries"}`,
    sparkline,
  };
}

function buildInventoryKpi(stock: StockSummary): DashboardKpi {
  const hint =
    stock.lowStockCount === 0
      ? "Stock levels healthy"
      : `${stock.lowStockCount} ${stock.lowStockCount === 1 ? "item" : "items"} low on stock`;
  return {
    id: "inventory",
    label: "Inventory value",
    value: stock.value,
    format: "currency",
    currency: stock.currency,
    hint,
  };
}

function buildArAging(invoices: ErpInvoiceRaw[], now: Date = new Date()): DashboardArBucket[] {
  const buckets: DashboardArBucket[] = [
    { label: "Current", value: 0 },
    { label: "1–30 days", value: 0 },
    { label: "31–60 days", value: 0 },
    { label: "61–90 days", value: 0 },
    { label: "90+ days", value: 0 },
  ];
  const today = utcDay(now);
  const [currentBucket, bucket30, bucket60, bucket90, bucket90Plus] = buckets as [
    DashboardArBucket,
    DashboardArBucket,
    DashboardArBucket,
    DashboardArBucket,
    DashboardArBucket,
  ];
  for (const invoice of invoices) {
    if (invoice.docstatus !== 1) continue;
    const amount = invoice.outstanding_amount ?? 0;
    if (amount <= 0) continue;
    if (!invoice.due_date) {
      currentBucket.value += amount;
      continue;
    }
    const days = Math.floor(
      (today - new Date(`${invoice.due_date}T00:00:00Z`).getTime()) / 86_400_000,
    );
    if (days <= 0) currentBucket.value += amount;
    else if (days <= 30) bucket30.value += amount;
    else if (days <= 60) bucket60.value += amount;
    else if (days <= 90) bucket90.value += amount;
    else bucket90Plus.value += amount;
  }
  return buckets.map((bucket) => ({ ...bucket, value: round2(bucket.value) }));
}

/**
 * Dashboard reads are backed by the tenant's real ERPNext site: revenue and
 * receivables come from submitted Sales Invoices, cash from Payment Entries,
 * and inventory from the Bin / Item doctypes (via WarehousesService). The
 * contract is unchanged from the earlier seed-based version.
 */
@Injectable()
export class DashboardService {
  constructor(
    private readonly gateway: ErpGatewayService,
    private readonly warehouses: WarehousesService,
  ) {}

  async overview(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    role: ProductRole,
  ): Promise<DashboardOverview> {
    const { client } = await this.gateway.scopeFor(user.id, meta.requestId);
    const [{ items: invoiceDocs }, { items: paymentDocs }, stock] = await Promise.all([
      client.list<ErpInvoiceRaw>(SALES_DOCTYPE.salesInvoice, {
        fields: [
          "name",
          "customer",
          "posting_date",
          "due_date",
          "grand_total",
          "outstanding_amount",
          "status",
          "docstatus",
          "creation",
          "modified",
          "owner",
        ],
        limitPageLength: 0,
      }),
      client.list<ErpPaymentRaw>(SALES_DOCTYPE.paymentEntry, {
        fields: ["name", "payment_type", "paid_amount", "posting_date", "docstatus"],
        limitPageLength: 0,
      }),
      this.warehouses.stockSummaryForClient(client),
    ]);

    return this.buildOverview(invoiceDocs, paymentDocs, stock, role);
  }

  private buildOverview(
    invoiceDocs: ErpInvoiceRaw[],
    paymentDocs: ErpPaymentRaw[],
    stock: StockSummary,
    role: ProductRole,
  ): DashboardOverview {
    const months = lastTwelveMonths();
    const revenue = buildRevenueKpi(invoiceDocs, months);
    const ar = buildArKpi(invoiceDocs, months);
    const cash = buildCashKpi(paymentDocs, months);
    const inventory = buildInventoryKpi(stock);
    const byId: Record<string, DashboardKpi> = { revenue, ar, cash, inventory };
    const kpis = ROLE_KPI_IDS[role]
      .map((id) => byId[id])
      .filter((kpi): kpi is DashboardKpi => kpi !== undefined);
    const quickActions = QUICK_ACTIONS.filter(
      (action) => !action.roles || action.roles.includes(role),
    );
    const revenueTrend: DashboardSeriesPoint[] = months.map((month, index) => ({
      label: month.label,
      value: revenue.sparkline?.[index] ?? 0,
    }));
    const cashTrend: DashboardSeriesPoint[] = months.map((month, index) => ({
      label: month.label,
      value: cash.sparkline?.[index] ?? 0,
    }));
    const allowedKpis = new Set(ROLE_KPI_IDS[role]);

    return {
      asOf: new Date().toISOString(),
      role,
      kpis,
      quickActions,
      revenueTrend: allowedKpis.has("revenue") ? revenueTrend : undefined,
      cashTrend: allowedKpis.has("cash") ? cashTrend : undefined,
      arAging: allowedKpis.has("ar") ? buildArAging(invoiceDocs) : undefined,
    };
  }

  async alerts(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    role: ProductRole = ProductRole.ADMIN,
  ): Promise<DashboardAlerts> {
    const { client } = await this.gateway.scopeFor(user.id, meta.requestId);
    const [{ items: invoiceDocs }, stock] = await Promise.all([
      client.list<ErpInvoiceRaw>(SALES_DOCTYPE.salesInvoice, {
        fields: ["name", "due_date", "outstanding_amount", "docstatus"],
        limitPageLength: 0,
      }),
      this.warehouses.stockSummaryForClient(client),
    ]);

    return this.buildAlerts(invoiceDocs, stock, role);
  }

  private buildAlerts(
    invoiceDocs: ErpInvoiceRaw[],
    stock: StockSummary,
    role: ProductRole,
  ): DashboardAlerts {
    const today = utcDay(new Date());
    const overdue = invoiceDocs
      .filter(
        (invoice) =>
          invoice.docstatus === 1 && (invoice.outstanding_amount ?? 0) > 0 && invoice.due_date,
      )
      .map((invoice) => ({ invoice, due: new Date(`${invoice.due_date}T00:00:00Z`).getTime() }))
      .filter(({ due }) => due < today)
      .sort((a, b) => a.due - b.due);

    const alerts: DashboardAlerts["alerts"] = [];
    if (overdue.length > 0) {
      const total = round2(
        overdue.reduce((sum, { invoice }) => sum + (invoice.outstanding_amount ?? 0), 0),
      );
      const oldest = overdue[0]!;
      const days = Math.floor((today - oldest.due) / 86_400_000);
      alerts.push({
        id: "overdue-invoices",
        severity: "critical",
        title: `${overdue.length} ${overdue.length === 1 ? "invoice is" : "invoices are"} overdue`,
        description: `Totalling $${total.toLocaleString("en-US")} — the oldest is ${oldest.invoice.name}, ${days} days late.`,
        href: "/finance",
      });
    }

    if (stock.lowStockCount > 0) {
      const label = stock.lowStock[0]?.name ?? stock.lowStock[0]?.code ?? "An item";
      alerts.push({
        id: "low-stock",
        severity: "warning",
        title: `${stock.lowStockCount} ${stock.lowStockCount === 1 ? "item is" : "items are"} low on stock`,
        description:
          stock.lowStockCount === 1
            ? `${label} needs re-ordering.`
            : `${label} and ${stock.lowStockCount - 1} others need re-ordering.`,
        href: "/inventory",
      });
    }

    const visibleAlerts = alerts.filter((alert) => {
      if (role === ProductRole.ADMIN) return true;
      if (alert.id === "overdue-invoices") {
        return role === ProductRole.ACCOUNTANT || role === ProductRole.SALES;
      }
      if (alert.id === "low-stock") return role === ProductRole.INVENTORY;
      return false;
    });

    return { alerts: visibleAlerts };
  }

  async activity(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    role: ProductRole = ProductRole.ADMIN,
  ): Promise<DashboardActivity> {
    const { client } = await this.gateway.scopeFor(user.id, meta.requestId);
    const [{ items: invoices }, { items: orders }, { items: quotations }, { items: customers }] =
      await Promise.all([
        client.list<ErpInvoiceRaw>(SALES_DOCTYPE.salesInvoice, {
          fields: ["name", "customer", "docstatus", "creation", "modified", "owner"],
          orderBy: "modified desc",
          limitPageLength: 20,
        }),
        client.list<ErpOrderRaw>(SALES_DOCTYPE.salesOrder, {
          fields: ["name", "creation", "modified", "owner"],
          orderBy: "modified desc",
          limitPageLength: 20,
        }),
        client.list<ErpQuotationRaw>(SALES_DOCTYPE.quotation, {
          fields: ["name", "creation", "modified", "owner"],
          orderBy: "modified desc",
          limitPageLength: 20,
        }),
        client.list<ErpCustomerRaw>(SALES_DOCTYPE.customer, {
          fields: ["name", "customer_name", "creation", "modified", "owner"],
          orderBy: "modified desc",
          limitPageLength: 20,
        }),
      ]);

    return this.buildActivity(invoices, orders, quotations, customers, role);
  }

  private buildActivity(
    invoices: ErpInvoiceRaw[],
    orders: ErpOrderRaw[],
    quotations: ErpQuotationRaw[],
    customers: ErpCustomerRaw[],
    role: ProductRole,
  ): DashboardActivity {
    const activity: ActivityItem[] = [
      ...invoices.map((doc) => ({
        id: `sales-invoice:${doc.name}`,
        action: doc.docstatus === 1 ? "Submitted invoice" : "Created invoice",
        target: `${doc.name} for ${doc.customer}`,
        href: "/sales",
        actor: doc.owner,
        time: toIso(doc.modified ?? doc.creation),
      })),
      ...orders.map((doc) => ({
        id: `sales-order:${doc.name}`,
        action: "Created sales order",
        target: doc.name,
        href: "/sales",
        actor: doc.owner,
        time: toIso(doc.modified ?? doc.creation),
      })),
      ...quotations.map((doc) => ({
        id: `quotation:${doc.name}`,
        action: "Created quotation",
        target: doc.name,
        href: "/sales",
        actor: doc.owner,
        time: toIso(doc.modified ?? doc.creation),
      })),
      ...customers.map((doc) => ({
        id: `customer:${doc.name}`,
        action: "Added customer",
        target: doc.customer_name ?? doc.name,
        href: "/sales",
        actor: doc.owner,
        time: toIso(doc.modified ?? doc.creation),
      })),
    ]
      .sort((a, b) => (a.time < b.time ? 1 : a.time > b.time ? -1 : 0))
      .slice(0, 8);

    const visibleActivity = activity.filter((item) => {
      if (role === ProductRole.ADMIN || role === ProductRole.SALES) return true;
      if (role === ProductRole.ACCOUNTANT) return item.id.startsWith("sales-invoice:");
      return false;
    });

    return { activity: visibleActivity };
  }

  async snapshot(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    role: ProductRole,
  ): Promise<DashboardSnapshot> {
    const { client } = await this.gateway.scopeFor(user.id, meta.requestId);
    const [
      { items: invoices },
      { items: payments },
      stock,
      { items: orders },
      { items: quotations },
      { items: customers },
    ] = await Promise.all([
      client.list<ErpInvoiceRaw>(SALES_DOCTYPE.salesInvoice, {
        fields: [
          "name",
          "customer",
          "posting_date",
          "due_date",
          "grand_total",
          "outstanding_amount",
          "status",
          "docstatus",
          "creation",
          "modified",
          "owner",
        ],
        orderBy: "modified desc",
        limitPageLength: 0,
      }),
      client.list<ErpPaymentRaw>(SALES_DOCTYPE.paymentEntry, {
        fields: ["name", "payment_type", "paid_amount", "posting_date", "docstatus"],
        limitPageLength: 0,
      }),
      this.warehouses.stockSummaryForClient(client),
      client.list<ErpOrderRaw>(SALES_DOCTYPE.salesOrder, {
        fields: ["name", "creation", "modified", "owner"],
        orderBy: "modified desc",
        limitPageLength: 20,
      }),
      client.list<ErpQuotationRaw>(SALES_DOCTYPE.quotation, {
        fields: ["name", "creation", "modified", "owner"],
        orderBy: "modified desc",
        limitPageLength: 20,
      }),
      client.list<ErpCustomerRaw>(SALES_DOCTYPE.customer, {
        fields: ["name", "customer_name", "creation", "modified", "owner"],
        orderBy: "modified desc",
        limitPageLength: 20,
      }),
    ]);

    return {
      overview: this.buildOverview(invoices, payments, stock, role),
      alerts: this.buildAlerts(invoices, stock, role),
      activity: this.buildActivity(invoices, orders, quotations, customers, role),
    };
  }
}
