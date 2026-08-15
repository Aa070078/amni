import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createErpClientForTenant,
  createExpenseClaim,
  createPurchaseOrder,
  createSupplier,
  encryptServiceSecret,
  findAccountByName,
  findSupplierByName,
  recordPaymentEntry,
  serializeServiceCredentials,
} from "@amni/erp";
import { ErrorCode } from "@amni/shared";

import { startMockFrappeServer, type MockFrappeServer } from "./mock-frappe-server";

const mocks = vi.hoisted(() => ({
  eRPInstance: { findUnique: vi.fn(), findFirst: vi.fn() },
}));

vi.mock("@amni/db", () => ({
  prisma: { eRPInstance: mocks.eRPInstance },
}));

const HEX_KEY = Buffer.alloc(32, 1).toString("hex");

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";

const KEY_A = { apiKey: "key-a", apiSecret: "secret-a" };
const KEY_B = { apiKey: "key-b", apiSecret: "secret-b" };

let siteA: MockFrappeServer;
let siteB: MockFrappeServer;

function cipher(apiKey: string, apiSecret: string): string {
  return encryptServiceSecret(serializeServiceCredentials(apiKey, apiSecret));
}

function mockTenant(tenantId: string, instance: { host: string; serviceKeyCipher: string | null }) {
  mocks.eRPInstance.findUnique.mockResolvedValue(instance);
  return { tenantId };
}

beforeAll(async () => {
  process.env.ENCRYPTION_KEY = HEX_KEY;
  siteA = await startMockFrappeServer({
    apiKey: KEY_A.apiKey,
    apiSecret: KEY_A.apiSecret,
    docs: [
      { name: "SUP-A-001", supplier_name: "Northwind Traders", supplier_group: "Wholesale" },
      { name: "ACC-A-001", account_name: "Office Expenses", account_type: "Expense" },
    ],
  });
  siteB = await startMockFrappeServer({
    apiKey: KEY_B.apiKey,
    apiSecret: KEY_B.apiSecret,
    docs: [
      { name: "SUP-B-001", supplier_name: "Northwind Traders", supplier_group: "Wholesale" },
      { name: "ACC-B-001", account_name: "Office Expenses", account_type: "Expense" },
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
});

describe("M5-004 purchasing & finance domain methods — tenant isolation", () => {
  it("tenant A reads only its own supplier, never tenant B's matching doc", async () => {
    mockTenant(TENANT_A, { host: siteA.url, serviceKeyCipher: cipher(KEY_A.apiKey, KEY_A.apiSecret) });
    const bRequestsBefore = siteB.requests.length;

    const client = await createErpClientForTenant({ tenantId: TENANT_A });
    const found = await findSupplierByName(client, "Northwind Traders");

    expect(found?.name).toBe("SUP-A-001");
    expect(siteB.requests).toHaveLength(bRequestsBefore);
  });

  it("tenant A creates a supplier only on tenant A's site", async () => {
    mockTenant(TENANT_A, { host: siteA.url, serviceKeyCipher: cipher(KEY_A.apiKey, KEY_A.apiSecret) });
    const bDocsBefore = [...siteB.docs.keys()];
    const bRequestsBefore = siteB.requests.length;

    const client = await createErpClientForTenant({ tenantId: TENANT_A });
    const created = await createSupplier(client, { name: "A-Only Traders", group: "General", status: "active" });

    expect(created.supplier_name).toBe("A-Only Traders");
    expect([...siteA.docs.values()].some((doc) => doc.supplier_name === "A-Only Traders")).toBe(true);
    expect([...siteB.docs.keys()]).toEqual(bDocsBefore);
    expect(siteB.requests).toHaveLength(bRequestsBefore);
    expect(siteA.requests.every((r) => r.authHeader === `token ${KEY_A.apiKey}:${KEY_A.apiSecret}`)).toBe(true);
  });

  it("tenant B reads only its own account even when account_name collides", async () => {
    mockTenant(TENANT_B, { host: siteB.url, serviceKeyCipher: cipher(KEY_B.apiKey, KEY_B.apiSecret) });
    const aRequestsBefore = siteA.requests.length;

    const client = await createErpClientForTenant({ tenantId: TENANT_B });
    const found = await findAccountByName(client, "Office Expenses");

    expect(found?.name).toBe("ACC-B-001");
    expect(siteA.requests).toHaveLength(aRequestsBefore);
  });

  it("tenant B's purchase order lands on tenant B's site only", async () => {
    mockTenant(TENANT_B, { host: siteB.url, serviceKeyCipher: cipher(KEY_B.apiKey, KEY_B.apiSecret) });
    const aDocsBefore = [...siteA.docs.keys()];
    const aRequestsBefore = siteA.requests.length;

    const client = await createErpClientForTenant({ tenantId: TENANT_B });
    const doc = await createPurchaseOrder(client, {
      supplier: "Beta Traders",
      items: [{ product: "PRD-0001", name: "Desk", qty: 2, rate: 50 }],
    });

    expect(doc.supplier).toBe("Beta Traders");
    expect([...siteB.docs.values()].some((d) => d.supplier === "Beta Traders" && Array.isArray(d.items))).toBe(true);
    expect([...siteA.docs.keys()]).toEqual(aDocsBefore);
    expect(siteA.requests).toHaveLength(aRequestsBefore);
  });

  it("expense claims and supplier payments are recorded on the tenant's own site", async () => {
    mockTenant(TENANT_A, { host: siteA.url, serviceKeyCipher: cipher(KEY_A.apiKey, KEY_A.apiSecret) });
    const bRequestsBefore = siteB.requests.length;

    const client = await createErpClientForTenant({ tenantId: TENANT_A });

    await createExpenseClaim(client, { category: "travel", description: "Client visit", amount: 120.5 });
    const payment = await recordPaymentEntry(client, {
      party: "Northwind Traders",
      partyType: "Supplier",
      paymentType: "Pay",
      paidAmount: 250,
    });

    expect(payment.party_type).toBe("Supplier");
    expect([...siteA.docs.values()].some((d) => d.expense_type === "travel")).toBe(true);
    expect([...siteA.docs.values()].some((d) => d.party === "Northwind Traders")).toBe(true);
    expect(siteB.requests).toHaveLength(bRequestsBefore);
  });

  it("rejects a call when the tenant has no provisioned ERP service account", async () => {
    mockTenant(TENANT_A, { host: siteA.url, serviceKeyCipher: null });

    await expect(createErpClientForTenant({ tenantId: TENANT_A })).rejects.toMatchObject({
      code: ErrorCode.ERP_UNAUTHORIZED,
    });
  });

  it("rejects a call for a tenant with no ERP instance at all", async () => {
    mocks.eRPInstance.findUnique.mockResolvedValue(null);

    await expect(createErpClientForTenant({ tenantId: "tenant-none" })).rejects.toMatchObject({
      code: ErrorCode.TENANT_NOT_READY,
    });
  });
});
