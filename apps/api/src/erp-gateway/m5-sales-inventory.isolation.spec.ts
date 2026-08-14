import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { encryptServiceSecret, serializeServiceCredentials } from "@amni/erp";
import {
  createCustomer,
  createErpClientForTenant,
  createSalesOrder,
  executeStockMovement,
  recordPaymentEntry,
  findCustomerByName,
  findItemBySku,
} from "@amni/erp";
import { ErrorCode } from "@amni/shared";

import { startMockFrappeServer, type MockFrappeServer } from "../erp-gateway/mock-frappe-server";

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
      { name: "CUST-A-001", customer_name: "Acme Corp", email_id: "shared@acme.io" },
      { name: "ITEM-A-001", item_code: "PRD-0001", item_name: "Desk" },
      { name: "WH-A-001", warehouse_name: "Main" },
    ],
  });
  siteB = await startMockFrappeServer({
    apiKey: KEY_B.apiKey,
    apiSecret: KEY_B.apiSecret,
    docs: [
      { name: "CUST-B-001", customer_name: "Acme Corp", email_id: "shared@beta.io" },
      { name: "ITEM-B-001", item_code: "PRD-0001", item_name: "Desk" },
      { name: "WH-B-001", warehouse_name: "Main" },
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

describe("M5-001 sales & inventory domain methods — tenant isolation", () => {
  it("tenant A reads only its own customer, never tenant B's matching doc", async () => {
    mockTenant(TENANT_A, { host: siteA.url, serviceKeyCipher: cipher(KEY_A.apiKey, KEY_A.apiSecret) });
    const bRequestsBefore = siteB.requests.length;

    const client = await createErpClientForTenant({ tenantId: TENANT_A });
    const found = await findCustomerByName(client, "Acme Corp");

    expect(found?.name).toBe("CUST-A-001");
    expect(siteB.requests).toHaveLength(bRequestsBefore);
  });

  it("tenant A creates a customer only on tenant A's site", async () => {
    mockTenant(TENANT_A, { host: siteA.url, serviceKeyCipher: cipher(KEY_A.apiKey, KEY_A.apiSecret) });
    const bDocsBefore = [...siteB.docs.keys()];
    const bRequestsBefore = siteB.requests.length;

    const client = await createErpClientForTenant({ tenantId: TENANT_A });
    const created = await createCustomer(client, { name: "A-Only Ltd", status: "active" });

    expect(created.customer_name).toBe("A-Only Ltd");
    expect([...siteA.docs.values()].some((doc) => doc.customer_name === "A-Only Ltd")).toBe(true);
    expect([...siteB.docs.keys()]).toEqual(bDocsBefore);
    expect(siteB.requests).toHaveLength(bRequestsBefore);
    expect(siteA.requests.every((r) => r.authHeader === `token ${KEY_A.apiKey}:${KEY_A.apiSecret}`)).toBe(true);
  });

  it("tenant B reads only its own item even when item_code collides", async () => {
    mockTenant(TENANT_B, { host: siteB.url, serviceKeyCipher: cipher(KEY_B.apiKey, KEY_B.apiSecret) });
    const aRequestsBefore = siteA.requests.length;

    const client = await createErpClientForTenant({ tenantId: TENANT_B });
    const found = await findItemBySku(client, "PRD-0001");

    expect(found?.name).toBe("ITEM-B-001");
    expect(siteA.requests).toHaveLength(aRequestsBefore);
  });

  it("tenant B's sales order lands on tenant B's site only", async () => {
    mockTenant(TENANT_B, { host: siteB.url, serviceKeyCipher: cipher(KEY_B.apiKey, KEY_B.apiSecret) });
    const aDocsBefore = [...siteA.docs.keys()];
    const aRequestsBefore = siteA.requests.length;

    const client = await createErpClientForTenant({ tenantId: TENANT_B });
    const doc = await createSalesOrder(client, {
      customer: "Beta Ltd",
      items: [{ product: "PRD-0001", name: "Desk", qty: 1, rate: 100 }],
    });

    expect(doc.customer).toBe("Beta Ltd");
    expect([...siteB.docs.values()].some((d) => d.customer === "Beta Ltd" && Array.isArray(d.items))).toBe(true);
    expect([...siteA.docs.keys()]).toEqual(aDocsBefore);
    expect(siteA.requests).toHaveLength(aRequestsBefore);
  });

  it("stock movements and payments are recorded on the tenant's own site", async () => {
    mockTenant(TENANT_A, { host: siteA.url, serviceKeyCipher: cipher(KEY_A.apiKey, KEY_A.apiSecret) });
    const bRequestsBefore = siteB.requests.length;

    const client = await createErpClientForTenant({ tenantId: TENANT_A });

    await executeStockMovement(client, {
      type: "in",
      productCode: "PRD-0001",
      quantity: 5,
      toWarehouse: "WH-A-001",
    });
    const payment = await recordPaymentEntry(client, { party: "Acme Corp", paidAmount: 100 });

    expect(payment.party_type).toBe("Customer");
    expect([...siteA.docs.values()].some((d) => d.stock_entry_type === "Material Receipt")).toBe(true);
    expect([...siteA.docs.values()].some((d) => d.party === "Acme Corp")).toBe(true);
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
