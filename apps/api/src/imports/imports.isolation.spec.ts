import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { encryptServiceSecret, serializeServiceCredentials } from "@amni/erp";
import { createErpClientForTenant, runImportToErp } from "@amni/erp";
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

const CUSTOMER_MAPPING = {
  mode: "create" as const,
  columns: [
    { sourceHeader: "Customer Name", targetField: "customer_name", required: true },
    { sourceHeader: "Email", targetField: "email", required: false },
  ],
};

const customerRows = (rows: Array<{ row: number; record: Record<string, string> }>) =>
  rows.map(({ row, record }) => ({ row, record: { ...record } }));

beforeAll(async () => {
  process.env.ENCRYPTION_KEY = HEX_KEY;
  siteA = await startMockFrappeServer({
    apiKey: KEY_A.apiKey,
    apiSecret: KEY_A.apiSecret,
    docs: [
      { name: "CUST-A-001", customer_name: "Acme Corp", email_id: "shared@acme.io" },
    ],
  });
  siteB = await startMockFrappeServer({
    apiKey: KEY_B.apiKey,
    apiSecret: KEY_B.apiSecret,
    docs: [
      { name: "CUST-B-001", customer_name: "Beta Ltd", email_id: "shared@beta.io" },
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

describe("import ERP writes — tenant isolation", () => {
  it("writes tenant A's import to tenant A's site only, using tenant A's service account", async () => {
    mockTenant(TENANT_A, { host: siteA.url, serviceKeyCipher: cipher(KEY_A.apiKey, KEY_A.apiSecret) });
    const bDocsBefore = [...siteB.docs.keys()];
    const bRequestsBefore = siteB.requests.length;

    const client = await createErpClientForTenant({ tenantId: TENANT_A });
    const result = await runImportToErp(
      client,
      "customers",
      customerRows([
        { row: 1, record: { customer_name: "Acme Imported", email: "new@acme.io" } },
        { row: 2, record: { customer_name: "Acme Imported 2", email: "new2@acme.io" } },
      ]),
      CUSTOMER_MAPPING,
    );

    expect(result.summary.created).toBe(2);
    expect(result.summary.failed).toBe(0);

    const created = [...siteA.docs.values()].filter((doc) => doc.customer_name === "Acme Imported");
    expect(created).toHaveLength(1);
    expect(created[0].email_id).toBe("new@acme.io");
    expect([...siteB.docs.keys()]).toEqual(bDocsBefore);
    expect(siteB.requests).toHaveLength(bRequestsBefore);
    expect(siteA.requests.every((r) => r.authHeader === `token ${KEY_A.apiKey}:${KEY_A.apiSecret}`)).toBe(true);
  });

  it("writes tenant B's import to tenant B's site only", async () => {
    mockTenant(TENANT_B, { host: siteB.url, serviceKeyCipher: cipher(KEY_B.apiKey, KEY_B.apiSecret) });
    const aDocsBefore = [...siteA.docs.keys()];

    const client = await createErpClientForTenant({ tenantId: TENANT_B });
    const result = await runImportToErp(
      client,
      "suppliers",
      customerRows([{ row: 1, record: { supplier_name: "Beta Supplies" } }]),
      {
        mode: "create",
        columns: [{ sourceHeader: "Supplier Name", targetField: "supplier_name", required: true }],
      },
    );

    expect(result.summary.created).toBe(1);
    expect([...siteA.docs.keys()]).toEqual(aDocsBefore);
    expect([...siteB.docs.values()].some((doc) => doc.supplier_name === "Beta Supplies")).toBe(true);
  });

  it("upserts by key on the tenant's own site without touching the other tenant's matching doc", async () => {
    mockTenant(TENANT_A, { host: siteA.url, serviceKeyCipher: cipher(KEY_A.apiKey, KEY_A.apiSecret) });
    const bDocBefore = siteB.docs.get("CUST-B-001");
    const bRequestsBefore = siteB.requests.length;

    const client = await createErpClientForTenant({ tenantId: TENANT_A });
    const result = await runImportToErp(
      client,
      "customers",
      customerRows([{ row: 1, record: { customer_name: "Acme Corp", email: "changed@acme.io" } }]),
      { mode: "upsert", keyField: "customer_name", columns: [] },
    );

    expect(result.summary.updated).toBe(1);
    const updated = siteA.docs.get("CUST-A-001");
    expect(updated?.email_id).toBe("changed@acme.io");
    // Tenant B's doc with the same key value is untouched.
    expect(siteB.docs.get("CUST-B-001")).toEqual(bDocBefore);
    expect(siteB.requests).toHaveLength(bRequestsBefore);
  });

  it("fails update_by_key rows when no matching doc exists on the tenant's site", async () => {
    mockTenant(TENANT_A, { host: siteA.url, serviceKeyCipher: cipher(KEY_A.apiKey, KEY_A.apiSecret) });

    const client = await createErpClientForTenant({ tenantId: TENANT_A });
    const result = await runImportToErp(
      client,
      "customers",
      customerRows([{ row: 1, record: { customer_name: "Nobody Here", email: "x@y.io" } }]),
      { mode: "update_by_key", keyField: "customer_name", columns: [] },
    );

    expect(result.summary.failed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].row).toBe(1);
    expect([...siteA.docs.values()].some((doc) => doc.customer_name === "Nobody Here")).toBe(false);
  });

  it("rejects an import when the tenant has no provisioned ERP instance", async () => {
    mockTenant(TENANT_A, { host: siteA.url, serviceKeyCipher: null });

    await expect(createErpClientForTenant({ tenantId: TENANT_A })).rejects.toMatchObject({
      code: ErrorCode.ERP_UNAUTHORIZED,
    });
  });

  it("rejects imports for tenants with no ERP instance at all", async () => {
    mocks.eRPInstance.findUnique.mockResolvedValue(null);

    await expect(createErpClientForTenant({ tenantId: "tenant-none" })).rejects.toMatchObject({
      code: ErrorCode.TENANT_NOT_READY,
    });
  });
});
