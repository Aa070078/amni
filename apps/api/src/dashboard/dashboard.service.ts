import { Injectable } from "@nestjs/common";
import {
  ProductRole,
  type DashboardAlerts,
  type DashboardActivity,
  type DashboardKpi,
  type DashboardOverview,
  type QuickAction,
} from "@amni/shared";

const PRODUCT_ROLES = Object.values(ProductRole) as string[];

export function resolveProductRole(value: unknown): ProductRole | undefined {
  return PRODUCT_ROLES.find((role) => role === value) as ProductRole | undefined;
}

const KPIS: Record<string, DashboardKpi> = {
  revenue: {
    id: "revenue",
    label: "Revenue",
    value: 284_500,
    format: "currency",
    currency: "USD",
    delta: 12.4,
    deltaLabel: "vs last month",
    trend: "up",
    hint: "Invoiced this month",
  },
  ar: {
    id: "ar",
    label: "Accounts receivable",
    value: 96_250,
    format: "currency",
    currency: "USD",
    delta: 3.1,
    deltaLabel: "vs last month",
    trend: "up",
    hint: "12 invoices outstanding",
  },
  ap: {
    id: "ap",
    label: "Accounts payable",
    value: 41_800,
    format: "currency",
    currency: "USD",
    delta: -1.8,
    deltaLabel: "vs last month",
    trend: "down",
    hint: "9 bills due this month",
  },
  cash: {
    id: "cash",
    label: "Cash balance",
    value: 512_400,
    format: "currency",
    currency: "USD",
    delta: 4.2,
    deltaLabel: "vs last month",
    trend: "up",
    hint: "Across 3 bank accounts",
  },
  inventory: {
    id: "inventory",
    label: "Inventory value",
    value: 187_600,
    format: "currency",
    currency: "USD",
    delta: -2.3,
    deltaLabel: "vs last month",
    trend: "down",
    hint: "5 items low on stock",
  },
};

const ROLE_KPI_IDS: Record<ProductRole, string[]> = {
  [ProductRole.ADMIN]: ["revenue", "ar", "ap", "cash", "inventory"],
  [ProductRole.ACCOUNTANT]: ["revenue", "ar", "ap", "cash"],
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

const minutesAgo = (minutes: number): string => new Date(Date.now() - minutes * 60_000).toISOString();

/**
 * Reference data for the Demo Co tenant. This module is the only dashboard
 * surface until the ERP gateway lands (M5); endpoints then read from the
 * tenant ERP site and keep the same contract.
 */
@Injectable()
export class DashboardService {
  overview(role: ProductRole): DashboardOverview {
    const kpiIds = ROLE_KPI_IDS[role];
    const kpis = kpiIds.map((id) => KPIS[id]).filter((kpi): kpi is DashboardKpi => kpi !== undefined);
    const quickActions = QUICK_ACTIONS.filter((action) => !action.roles || action.roles.includes(role));

    return { asOf: new Date().toISOString(), role, kpis, quickActions };
  }

  alerts(): DashboardAlerts {
    return {
      alerts: [
        {
          id: "overdue-invoices",
          severity: "critical",
          title: "3 invoices are overdue",
          description: "Totalling $18,240 — the oldest is SO-2041, 12 days late.",
          href: "/finance",
        },
        {
          id: "low-stock",
          severity: "warning",
          title: "5 items are low on stock",
          description: "Nimbus LED Panel and 4 others need re-ordering.",
          href: "/inventory",
        },
        {
          id: "pending-po-approval",
          severity: "info",
          title: "2 purchase orders await approval",
          description: "PO-0021 and PO-0022 are pending review.",
          href: "/purchasing",
        },
      ],
    };
  }

  activity(): DashboardActivity {
    return {
      activity: [
        {
          id: "act-1",
          action: "Created sales order",
          target: "SO-2041",
          href: "/sales",
          actor: "Amara Osei",
          time: minutesAgo(25),
        },
        {
          id: "act-2",
          action: "Recorded payment",
          target: "P-0007 against INV-0003",
          href: "/finance",
          actor: "Amara Osei",
          time: minutesAgo(70),
        },
        {
          id: "act-3",
          action: "Updated item",
          target: "Nimbus LED Panel",
          href: "/inventory",
          actor: "Theo Lindqvist",
          time: minutesAgo(190),
        },
        {
          id: "act-4",
          action: "Created invoice",
          target: "INV-0003 for Serenity Interiors",
          href: "/sales",
          actor: "Amara Osei",
          time: minutesAgo(300),
        },
        {
          id: "act-5",
          action: "Added customer",
          target: "Serenity Interiors",
          href: "/sales",
          actor: "Amara Osei",
          time: minutesAgo(1_600),
        },
        {
          id: "act-6",
          action: "Created purchase order",
          target: "PO-0021 for Lumina Supplies",
          href: "/purchasing",
          actor: "Theo Lindqvist",
          time: minutesAgo(2_900),
        },
      ],
    };
  }
}
