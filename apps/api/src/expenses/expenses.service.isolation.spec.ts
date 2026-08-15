import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { encryptServiceSecret, serializeServiceCredentials } from "@amni/erp";
import { ErrorCode } from "@amni/shared";

import { ErpGatewayService, type GatewayRequestMeta, type GatewayUser } from "../erp-gateway/erp-gateway.service";
import { startMockFrappeServer, type MockFrappeServer } from "../erp-gateway/mock-frappe-server";
import { ExpensesService } from "./expenses.service";

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

function expenseDoc(name: string, amount: number, docstatus = 1) {
  return {
    name,
    doctype: "Expense Claim",
    expense_type: "software",
    posting_date: "2026-08-01",
    remarks: "Design suite annual licence",
    supplier: "Lumen Software",
    grand_total: amount,
    approval_status: "Draft",
    expense_approver: "Amara Osei",
    payment_reference: docstatus === 1 ? `PAID-${name}` : undefined,
    docstatus,
    creation: "2026-08-02T00:00:00.000Z",
    modified: "2026-08-03T00:00:00.000Z",
  };
}

function claimDoc(name: string, employee: string, amount: number, items: Record<string, unknown>[]) {
  return {
    name,
    doctype: "Expense Claim",
    employee,
    department: "Sales",
    remarks: "Berlin trade show",
    user_remark: "Approved per travel policy.",
    grand_total: amount,
    approval_status: "Draft",
    docstatus: 0,
    expenses: items,
    creation: "2026-08-02T00:00:00.000Z",
    modified: "2026-08-02T00:00:00.000Z",
  };
}

beforeAll(async () => {
  process.env.ENCRYPTION_KEY = HEX_KEY;
  siteA = await startMockFrappeServer({
    apiKey: KEY_A.apiKey,
    apiSecret: KEY_A.apiSecret,
    docs: [
      expenseDoc("EXP-0001", 1290),
      claimDoc("CLM-0001", "Mina Delacroix", 1480, [
        { expense_type: "travel", expense_date: "2026-08-10", description: "Flights", amount: 820 },
      ]),
    ],
  });
  siteB = await startMockFrappeServer({
    apiKey: KEY_B.apiKey,
    apiSecret: KEY_B.apiSecret,
    docs: [
      expenseDoc("EXP-0001", 1290),
      claimDoc("CLM-0001", "Mina Delacroix", 1480, [
        { expense_type: "travel", expense_date: "2026-08-10", description: "Flights", amount: 820 },
      ]),
    ],
  });
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

describe("M5-005 expenses service — ERP-backed tenant isolation", () => {
  it("creates an expense on the tenant's own site with the next code and audits it", async () => {
    mockCompanyErp("company-a", siteA);
    const bDocsBefore = [...siteB.docs.keys()];
    const bRequestsBefore = siteB.requests.length;

    const service = new ExpensesService(new ErpGatewayService());
    const created = await service.create(USER_A, META, {
      category: "software",
      description: "CRM licence",
      amount: 600,
    });

    expect(created.code).toBe("EXP-0002");
    expect(created.status).toBe("draft");
    expect(created.amount).toBe(600);
    expect([...siteA.docs.values()].some((d) => d.name === "EXP-0002" && d.expense_type === "software")).toBe(true);
    expect([...siteB.docs.keys()]).toEqual(bDocsBefore);
    expect(siteB.requests).toHaveLength(bRequestsBefore);
    expect(mocks.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "erp.create", resourceType: "Expense Claim", resourceId: "EXP-0002" }),
      }),
    );
  });

  it("lists only the tenant's own expenses with mapped statuses", async () => {
    mockCompanyErp("company-b", siteB);

    const service = new ExpensesService(new ErpGatewayService());
    const result = await service.list(USER_B, META, { page: 1, pageSize: 20 });

    expect(result.meta.total).toBe(1);
    expect(result.items[0]?.code).toBe("EXP-0001");
    expect(result.items[0]?.status).toBe("paid");
    expect(result.items[0]?.amount).toBe(1290);
    expect(siteA.requests).toHaveLength(0);
  });

  it("separates claims (CLM-) from expenses (EXP-) and lists tenant claims only", async () => {
    mockCompanyErp("company-b", siteB);

    const service = new ExpensesService(new ErpGatewayService());
    const result = await service.listClaims(USER_B, META, { page: 1, pageSize: 20 });

    expect(result.meta.total).toBe(1);
    expect(result.items[0]?.code).toBe("CLM-0001");
    expect(result.items[0]?.status).toBe("draft");
    expect(result.items[0]?.total).toBe(1480);
    expect(result.items[0]?.items[0]).toMatchObject({ description: "Flights", amount: 820 });
    expect(result.items[0]?.notes).toBe("Approved per travel policy.");
    expect(siteA.requests).toHaveLength(0);
  });

  it("returns 404 for an expense that exists only on the other tenant", async () => {
    mockCompanyErp("company-a", siteA);
    await siteA.docs.delete("EXP-0099");
    await siteB.docs.delete("EXP-0099");
    await siteB.docs.set("EXP-0099", expenseDoc("EXP-0099", 99, 0));

    const service = new ExpensesService(new ErpGatewayService());
    await expect(service.detail(USER_A, META, "EXP-0099")).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND, status: 404 });
  });

  it("submits an expense through the gateway action and audits it", async () => {
    mockCompanyErp("company-a", siteA);
    await siteA.docs.set("EXP-0003", expenseDoc("EXP-0003", 50, 0));

    const service = new ExpensesService(new ErpGatewayService());
    const updated = await service.changeStatus(USER_A, META, "EXP-0003", { status: "submitted" });

    expect(updated.code).toBe("EXP-0003");
    expect(updated.status).toBe("submitted");
    expect(mocks.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "erp.update", resourceType: "Expense Claim", resourceId: "EXP-0003" }),
      }),
    );
  });

  it("marks an expense paid through payment_reference on the tenant's own site", async () => {
    mockCompanyErp("company-a", siteA);
    await siteA.docs.set("EXP-0004", expenseDoc("EXP-0004", 75, 1));

    const service = new ExpensesService(new ErpGatewayService());
    const updated = await service.changeStatus(USER_A, META, "EXP-0004", { status: "paid" });

    expect(updated.status).toBe("paid");
    expect(updated.paymentRef).toMatch(/^PAID-EXP-0004-/);
    expect(siteB.requests).toHaveLength(0);
  });
});
