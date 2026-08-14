import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { encryptServiceSecret, serializeServiceCredentials } from "@amni/erp";

import { ErpGatewayService, type GatewayRequestMeta, type GatewayUser } from "../erp-gateway/erp-gateway.service";
import { startMockFrappeServer, type MockFrappeServer } from "../erp-gateway/mock-frappe-server";
import { FinanceService } from "./finance.service";

const mocks = vi.hoisted(() => ({
  eRPInstance: { findUnique: vi.fn(), findFirst: vi.fn() },
  membership: { findFirst: vi.fn() },
  auditLog: { create: vi.fn() },
}));

vi.mock("@amni/db", () => ({
  prisma: { eRPInstance: mocks.eRPInstance, membership: mocks.membership, auditLog: mocks.auditLog },
}));

const HEX_KEY = Buffer.alloc(32, 1).toString("hex");

const KEY_A = { apiKey: "key-a", apiSecret: "secret-a" };
const KEY_B = { apiKey: "key-b", apiSecret: "secret-b" };

const USER_A: GatewayUser = { id: "user-a", email: "a@acme.io", role: "member" };
const USER_B: GatewayUser = { id: "user-b", email: "b@beta.io", role: "member" };
const META: GatewayRequestMeta = { ip: "127.0.0.1", requestId: "req-1" };

let siteA: MockFrappeServer;
let siteB: MockFrappeServer;

function cipher(apiKey: string, apiSecret: string): string {
  return encryptServiceSecret(serializeServiceCredentials(apiKey, apiSecret));
}

function scopeCompany(userId: string): string {
  return userId === USER_A.id ? "company-a" : "company-b";
}

function mockCompanyErp(companyId: string, site: MockFrappeServer) {
  mocks.eRPInstance.findFirst.mockResolvedValue({
    host: site.url,
    serviceKeyCipher: cipher(site === siteA ? KEY_A.apiKey : KEY_B.apiKey, site === siteA ? KEY_A.apiSecret : KEY_B.apiSecret),
  });
  return { companyId };
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function fixtureDocs() {
  return [
    {
      name: "INV-0001",
      doctype: "Sales Invoice",
      grand_total: 5000,
      outstanding_amount: 1500,
      posting_date: daysAgo(50),
      due_date: daysAgo(50),
      docstatus: 1,
    },
    {
      name: "PINV-0001",
      doctype: "Purchase Invoice",
      grand_total: 2000,
      outstanding_amount: 800,
      posting_date: daysAgo(15),
      due_date: daysAgo(15),
      docstatus: 1,
    },
    { name: "PAY-0001", doctype: "Payment Entry", payment_type: "Receive", received_amount: 3000, paid_amount: 0, posting_date: daysAgo(20), docstatus: 1 },
    { name: "PAY-0002", doctype: "Payment Entry", payment_type: "Pay", paid_amount: 1000, received_amount: 0, posting_date: daysAgo(15), docstatus: 1 },
    { name: "EXP-0001", doctype: "Expense Claim", grand_total: 700, posting_date: daysAgo(10), docstatus: 1 },
  ];
}

beforeAll(async () => {
  process.env.ENCRYPTION_KEY = HEX_KEY;
  siteA = await startMockFrappeServer({ apiKey: KEY_A.apiKey, apiSecret: KEY_A.apiSecret, docs: fixtureDocs() });
  siteB = await startMockFrappeServer({ apiKey: KEY_B.apiKey, apiSecret: KEY_B.apiSecret, docs: fixtureDocs() });
});

afterAll(async () => {
  delete process.env.ENCRYPTION_KEY;
  await siteA.close();
  await siteB.close();
});

beforeEach(() => {
  mocks.eRPInstance.findUnique.mockReset();
  mocks.eRPInstance.findFirst.mockReset();
  mocks.membership.findFirst.mockReset();
  mocks.auditLog.create.mockReset();
  mocks.membership.findFirst.mockImplementation((args: { where?: { userId?: string } }) => ({
    companyId: scopeCompany(args?.where?.userId ?? ""),
  }));
  siteA.requests.length = 0;
  siteB.requests.length = 0;
});

describe("M5-006 finance service — ERP-backed tenant isolation", () => {
  it("computes overview KPIs from the tenant's own site only", async () => {
    mockCompanyErp("company-a", siteA);
    const bRequestsBefore = siteB.requests.length;

    const service = new FinanceService(new ErpGatewayService());
    const overview = await service.overview(USER_A, META);

    const kpi = (id: string) => overview.kpis.find((entry) => entry.id === id)?.value;
    expect(kpi("revenue")).toBe(5000);
    expect(kpi("ar")).toBe(1500);
    expect(kpi("ap")).toBe(800);
    expect(kpi("cash")).toBe(2000);
    expect(overview.apAging.find((bucket) => bucket.label === "1–30")?.value).toBe(800);
    expect(siteB.requests).toHaveLength(bRequestsBefore);
  });

  it("returns the same tenant-isolated overview when run against the other site", async () => {
    mockCompanyErp("company-b", siteB);

    const service = new FinanceService(new ErpGatewayService());
    const overview = await service.overview(USER_B, META);

    expect(overview.kpis.find((entry) => entry.id === "revenue")?.value).toBe(5000);
    expect(siteA.requests).toHaveLength(0);
  });

  it("builds the ar_aging report from the tenant's own invoices", async () => {
    mockCompanyErp("company-a", siteA);

    const service = new FinanceService(new ErpGatewayService());
    const report = await service.report(USER_A, META, "ar_aging");

    expect(report.title).toBe("Accounts receivable aging");
    expect(report.rows.find((row) => row.account === "31–60 days")?.amount).toBe(1500);
    expect(report.total).toBe(1500);
    expect(siteB.requests).toHaveLength(0);
  });

  it("builds income statement and cash flow from ERP doctype aggregates", async () => {
    mockCompanyErp("company-a", siteA);

    const service = new FinanceService(new ErpGatewayService());
    const income = await service.report(USER_A, META, "income_statement");
    const cashFlow = await service.report(USER_A, META, "cash_flow");

    expect(income.rows.find((row) => row.account === "Sales revenue")?.amount).toBe(5000);
    expect(income.rows.find((row) => row.account === "Expenses")?.amount).toBe(-700);
    expect(cashFlow.rows.find((row) => row.account === "Net cash flow")?.amount).toBe(2000);
    expect(siteB.requests).toHaveLength(0);
  });
});
