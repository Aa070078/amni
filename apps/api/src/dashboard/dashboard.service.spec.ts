import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductRole } from "@amni/shared";
import type * as ErpModule from "@amni/erp";

import { DashboardService } from "./dashboard.service";
import {
  ErpGatewayService,
  type GatewayRequestMeta,
  type GatewayUser,
} from "../erp-gateway/erp-gateway.service";

const mocks = vi.hoisted(() => {
  const client = { list: vi.fn() };
  return {
    membership: { findFirst: vi.fn() },
    createErpClientForTenant: vi.fn(async () => client),
    client,
    stockSummary: vi.fn(),
  };
});

vi.mock("@amni/db", () => ({
  prisma: { membership: mocks.membership },
}));

vi.mock("@amni/erp", async (importOriginal) => ({
  ...(await importOriginal<typeof ErpModule>()),
  createErpClientForTenant: mocks.createErpClientForTenant,
}));

const USER: GatewayUser = { id: "user-1", email: "owner@acme.com", role: "USER" };
const META: GatewayRequestMeta = { ip: "10.0.0.1", requestId: "req-1" };

const monthKey = (offset = 0): string => {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const dateDaysAgo = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const INVOICES = [
  {
    name: "INV-0001",
    customer: "Acme Ltd",
    posting_date: `${monthKey()}-05`,
    due_date: dateDaysAgo(-10),
    grand_total: 100_000,
    outstanding_amount: 40_000,
    status: "Submitted",
    docstatus: 1,
    modified: "2026-07-01 09:00:00",
  },
  {
    name: "INV-0002",
    customer: "Acme Ltd",
    posting_date: `${monthKey()}-12`,
    due_date: dateDaysAgo(15),
    grand_total: 60_000,
    outstanding_amount: 60_000,
    status: "Submitted",
    docstatus: 1,
    modified: "2026-07-02 09:00:00",
  },
  {
    name: "INV-0003",
    customer: "Beta Co",
    posting_date: `${monthKey(-1)}-20`,
    due_date: dateDaysAgo(45),
    grand_total: 30_000,
    outstanding_amount: 10_000,
    status: "Submitted",
    docstatus: 1,
    modified: "2026-07-03 09:00:00",
  },
  {
    name: "INV-0004",
    customer: "Gamma Co",
    posting_date: `${monthKey()}-03`,
    grand_total: 5_000,
    outstanding_amount: 5_000,
    status: "Draft",
    docstatus: 0,
    modified: "2026-07-04 09:00:00",
  },
];

const PAYMENTS = [
  {
    name: "PAY-0001",
    party: "Acme Ltd",
    party_type: "Customer",
    payment_type: "Receive",
    paid_amount: 20_000,
    posting_date: `${monthKey()}-06`,
    docstatus: 1,
  },
  {
    name: "PAY-0002",
    party: "Beta Co",
    party_type: "Customer",
    payment_type: "Receive",
    paid_amount: 15_000,
    posting_date: `${monthKey(-1)}-25`,
    docstatus: 1,
  },
  {
    name: "PAY-0003",
    party: "Tax Office",
    party_type: "Supplier",
    payment_type: "Pay",
    paid_amount: 3_000,
    posting_date: `${monthKey()}-08`,
    docstatus: 1,
  },
];

function mockList() {
  mocks.client.list.mockImplementation(async (doctype: string) => {
    if (doctype === "Sales Invoice") return { items: INVOICES, hasMore: false };
    if (doctype === "Payment Entry") return { items: PAYMENTS, hasMore: false };
    return { items: [], hasMore: false };
  });
}

describe("DashboardService", () => {
  let service: DashboardService;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createErpClientForTenant.mockResolvedValue(mocks.client);
    mocks.membership.findFirst.mockResolvedValue({ companyId: "company-1" });
    mocks.stockSummary.mockResolvedValue({
      value: 187_600,
      lowStockCount: 5,
      warehouses: 3,
      currency: "USD",
      lowStock: [{ code: "PRD-0001", name: "Nimbus LED Panel" }],
    });
    service = new DashboardService(new ErpGatewayService(), {
      stockSummaryForClient: mocks.stockSummary,
    } as never);
  });

  describe("overview", () => {
    it("computes KPIs from the tenant ERP site", async () => {
      mockList();

      const overview = await service.overview(USER, META, ProductRole.ADMIN);

      expect(overview.role).toBe(ProductRole.ADMIN);
      expect(overview.asOf).toBeTruthy();
      expect(mocks.client.list).toHaveBeenCalledWith(
        "Sales Invoice",
        expect.objectContaining({ limitPageLength: 0 }),
      );
      expect(mocks.client.list).toHaveBeenCalledWith(
        "Payment Entry",
        expect.objectContaining({ limitPageLength: 0 }),
      );

      const byId = Object.fromEntries(overview.kpis.map((kpi) => [kpi.id, kpi]));
      expect(byId.revenue).toMatchObject({ value: 160_000, hint: "Invoiced this month" });
      expect(byId.ar).toMatchObject({ value: 110_000, hint: "3 invoices outstanding" });
      expect(byId.cash).toMatchObject({ value: 32_000, hint: "3 payment entries" });
      expect(byId.inventory).toMatchObject({ value: 187_600, hint: "5 items low on stock" });

      expect(overview.kpis.map((kpi) => kpi.id)).toEqual(["revenue", "ar", "cash", "inventory"]);
      expect(overview.revenueTrend).toHaveLength(12);
      expect(overview.revenueTrend?.at(-1)).toMatchObject({ value: 160_000 });
      expect(overview.cashTrend?.at(-1)).toMatchObject({ value: 32_000 });
      expect(overview.arAging).toEqual([
        { label: "Current", value: 40_000 },
        { label: "1–30 days", value: 60_000 },
        { label: "31–60 days", value: 10_000 },
        { label: "61–90 days", value: 0 },
        { label: "90+ days", value: 0 },
      ]);
    });

    it("filters KPIs and quick actions by role", async () => {
      mockList();

      const sales = await service.overview(USER, META, ProductRole.SALES);
      expect(sales.kpis.map((kpi) => kpi.id)).toEqual(["revenue", "ar"]);
      expect(sales.quickActions.some((action) => action.id === "new-sales-order")).toBe(true);
      expect(sales.quickActions.some((action) => action.id === "financial-report")).toBe(false);

      const inventoryOnly = await service.overview(USER, META, ProductRole.INVENTORY);
      expect(inventoryOnly.kpis.map((kpi) => kpi.id)).toEqual(["inventory"]);
      expect(inventoryOnly.revenueTrend).toBeUndefined();
      expect(inventoryOnly.cashTrend).toBeUndefined();
      expect(inventoryOnly.arAging).toBeUndefined();

      const member = await service.overview(USER, META, ProductRole.MEMBER);
      expect(member.kpis.map((kpi) => kpi.id)).toEqual(["revenue"]);
      expect(member.revenueTrend).toHaveLength(12);
      expect(member.cashTrend).toBeUndefined();
      expect(member.arAging).toBeUndefined();
    });
  });

  describe("alerts", () => {
    it("flags overdue invoices and low stock", async () => {
      mockList();

      const result = await service.alerts(USER, META);

      expect(result.alerts).toHaveLength(2);
      expect(result.alerts[0]).toMatchObject({
        id: "overdue-invoices",
        severity: "critical",
        title: "2 invoices are overdue",
      });
      expect(result.alerts[0].description).toContain("$70,000");
      expect(result.alerts[0].description).toContain("INV-0003");
      expect(result.alerts[1]).toMatchObject({
        id: "low-stock",
        severity: "warning",
        title: "5 items are low on stock",
        description: "Nimbus LED Panel and 4 others need re-ordering.",
      });
    });

    it("returns no alerts when books are clean", async () => {
      mocks.client.list.mockResolvedValue({ items: [], hasMore: false });
      mocks.stockSummary.mockResolvedValue({
        value: 0,
        lowStockCount: 0,
        warehouses: 1,
        currency: "USD",
        lowStock: [],
      });

      const result = await service.alerts(USER, META);

      expect(result.alerts).toEqual([]);
    });
  });

  describe("activity", () => {
    it("derives a sorted activity feed from ERP docs", async () => {
      mocks.client.list.mockImplementation(async (doctype: string) => {
        if (doctype === "Sales Invoice") {
          return {
            items: [
              {
                name: "INV-0001",
                customer: "Acme Ltd",
                docstatus: 1,
                modified: "2026-07-01 09:00:00",
                owner: "amara",
              },
              {
                name: "INV-0002",
                customer: "Acme Ltd",
                docstatus: 0,
                modified: "2026-07-04 09:00:00",
                owner: "amara",
              },
            ],
            hasMore: false,
          };
        }
        if (doctype === "Sales Order") {
          return {
            items: [{ name: "SO-2041", modified: "2026-07-03 09:00:00", owner: "amara" }],
            hasMore: false,
          };
        }
        if (doctype === "Quotation") {
          return {
            items: [{ name: "QT-0001", modified: "2026-07-02 09:00:00", owner: "theo" }],
            hasMore: false,
          };
        }
        if (doctype === "Customer") {
          return {
            items: [
              {
                name: "CUS-0001",
                customer_name: "Serenity Interiors",
                modified: "2026-07-05 09:00:00",
                owner: "theo",
              },
            ],
            hasMore: false,
          };
        }
        return { items: [], hasMore: false };
      });

      const result = await service.activity(USER, META);

      expect(result.activity).toHaveLength(5);
      expect(result.activity[0]).toMatchObject({
        id: "customer:CUS-0001",
        action: "Added customer",
        target: "Serenity Interiors",
        href: "/sales",
        actor: "theo",
      });
      expect(result.activity[1].action).toBe("Created invoice");
      expect(result.activity.map((item) => item.id)).toEqual([
        "customer:CUS-0001",
        "sales-invoice:INV-0002",
        "sales-order:SO-2041",
        "quotation:QT-0001",
        "sales-invoice:INV-0001",
      ]);
    });
  });

  describe("snapshot", () => {
    it("loads all dashboard panels through one tenant scope", async () => {
      mockList();

      const result = await service.snapshot(USER, META, ProductRole.MEMBER);

      expect(result.overview.role).toBe(ProductRole.MEMBER);
      expect(result.alerts.alerts).toEqual([]);
      expect(result.activity.activity).toEqual([]);
      expect(mocks.membership.findFirst).toHaveBeenCalledTimes(1);
      expect(mocks.stockSummary).toHaveBeenCalledTimes(1);
    });
  });
});
