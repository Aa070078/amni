import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { encryptServiceSecret, serializeServiceCredentials } from "@amni/erp";
import { ErrorCode } from "@amni/shared";

import { ApiException } from "../common/api.exception";
import {
  ErpGatewayService,
  type GatewayRequestMeta,
  type GatewayUser,
} from "../erp-gateway/erp-gateway.service";
import { startMockFrappeServer, type MockFrappeServer } from "../erp-gateway/mock-frappe-server";
import { SalesOrdersService } from "./sales-orders.service";

const mocks = vi.hoisted(() => ({
  membership: { findFirst: vi.fn() },
  eRPInstance: { findUnique: vi.fn(), findFirst: vi.fn() },
  auditLog: { create: vi.fn() },
}));

vi.mock("@amni/db", () => ({
  prisma: { membership: mocks.membership, eRPInstance: mocks.eRPInstance, auditLog: mocks.auditLog },
}));

const HEX_KEY = Buffer.alloc(32, 1).toString("hex");

const USER_A: GatewayUser = { id: "user-a", email: "a@acme.com", role: "USER" };
const COMPANY_A = "company-a";
const META: GatewayRequestMeta = { ip: "127.0.0.1", requestId: "req-sales-orders-isolation" };

const KEY_A = { apiKey: "key-a", apiSecret: "secret-a" };
const KEY_B = { apiKey: "key-b", apiSecret: "secret-b" };

let siteA: MockFrappeServer;
let siteB: MockFrappeServer;
let service: SalesOrdersService;

function cipher(apiKey: string, apiSecret: string): string {
  return encryptServiceSecret(serializeServiceCredentials(apiKey, apiSecret));
}

function mockTenant(companyId: string, instance: { host: string; serviceKeyCipher: string | null }) {
  mocks.membership.findFirst.mockResolvedValue({ companyId });
  mocks.eRPInstance.findFirst.mockResolvedValue(instance);
}

async function expectApiException(promise: Promise<unknown>, code: ErrorCode, status: number): Promise<void> {
  try {
    await promise;
    expect.unreachable("expected an ApiException to be thrown");
  } catch (err) {
    expect(err).toBeInstanceOf(ApiException);
    expect((err as ApiException).code).toBe(code);
    expect((err as ApiException).getStatus()).toBe(status);
  }
}

beforeAll(async () => {
  process.env.ENCRYPTION_KEY = HEX_KEY;
  siteA = await startMockFrappeServer({
    apiKey: KEY_A.apiKey,
    apiSecret: KEY_A.apiSecret,
    docs: [
      { name: "CUST-A-001", customer_name: "Acme Corp", creation: "2026-01-01 09:00:00" },
      {
        name: "SO-A-001",
        customer: "CUST-A-001",
        transaction_date: "2026-07-01 09:00:00",
        delivery_date: "2026-07-15 09:00:00",
        currency: "USD",
        docstatus: 0,
        items: [{ item_code: "PRD-A-001", item_name: "Desk", qty: 2, rate: 100, amount: 200, uom: "pcs" }],
        grand_total: 200,
        creation: "2026-07-01 09:00:00",
        modified: "2026-07-01 09:00:00",
      },
    ],
  });
  siteB = await startMockFrappeServer({
    apiKey: KEY_B.apiKey,
    apiSecret: KEY_B.apiSecret,
    docs: [
      { name: "CUST-B-001", customer_name: "Beta Ltd", creation: "2026-02-01 09:00:00" },
      {
        name: "SO-B-001",
        customer: "CUST-B-001",
        transaction_date: "2026-07-02 09:00:00",
        delivery_date: "2026-07-16 09:00:00",
        currency: "USD",
        docstatus: 0,
        items: [{ item_code: "PRD-B-001", item_name: "Chair", qty: 1, rate: 80, amount: 80, uom: "pcs" }],
        grand_total: 80,
        creation: "2026-07-02 09:00:00",
        modified: "2026-07-02 09:00:00",
      },
    ],
  });
  service = new SalesOrdersService(new ErpGatewayService());
});

afterAll(async () => {
  delete process.env.ENCRYPTION_KEY;
  await siteA.close();
  await siteB.close();
});

beforeEach(() => {
  mocks.membership.findFirst.mockReset();
  mocks.eRPInstance.findUnique.mockReset();
  mocks.eRPInstance.findFirst.mockReset();
  mocks.auditLog.create.mockReset();
  mocks.auditLog.create.mockResolvedValue({ id: "audit-1" });
});

describe("SalesOrdersService tenant isolation", () => {
  it("tenant A reads only its own sales orders and never hits tenant B's site", async () => {
    mockTenant(COMPANY_A, { host: siteA.url, serviceKeyCipher: cipher(KEY_A.apiKey, KEY_A.apiSecret) });
    const aRequestsBefore = siteA.requests.length;
    const bRequestsBefore = siteB.requests.length;

    const detail = await service.detail(USER_A, META, "SO-A-001");
    expect(detail.code).toBe("SO-A-001");
    expect(detail.customer.name).toBe("Acme Corp");

    const list = await service.list(USER_A, META, { page: 1, pageSize: 20 });
    expect(list.items.some((order) => order.code === "SO-B-001")).toBe(false);

    expect(siteA.requests.length).toBeGreaterThan(aRequestsBefore);
    expect(siteB.requests).toHaveLength(bRequestsBefore);
  });

  it("returns not_found (404) for tenant B's sales order and never calls tenant B's site", async () => {
    mockTenant(COMPANY_A, { host: siteA.url, serviceKeyCipher: cipher(KEY_A.apiKey, KEY_A.apiSecret) });
    const bRequestsBefore = siteB.requests.length;

    await expectApiException(service.detail(USER_A, META, "SO-B-001"), ErrorCode.NOT_FOUND, 404);

    expect(siteB.requests).toHaveLength(bRequestsBefore);
  });

  it("creates a sales order on tenant A's site only, using tenant A's service account", async () => {
    mockTenant(COMPANY_A, { host: siteA.url, serviceKeyCipher: cipher(KEY_A.apiKey, KEY_A.apiSecret) });
    const bDocsBefore = [...siteB.docs.keys()];
    const bRequestsBefore = siteB.requests.length;

    const created = await service.create(USER_A, META, {
      customerCode: "CUST-A-001",
      items: [{ product: "PRD-A-001", name: "Desk", qty: 2, rate: 100 }],
    });

    expect(created.code).toBeDefined();
    expect([...siteA.docs.values()].some((doc) => doc.customer === "CUST-A-001" && Array.isArray(doc.items))).toBe(true);
    expect([...siteB.docs.keys()]).toEqual(bDocsBefore);
    expect(siteB.requests).toHaveLength(bRequestsBefore);
    expect(siteA.requests.every((r) => r.authHeader === `token ${KEY_A.apiKey}:${KEY_A.apiSecret}`)).toBe(true);
  });

  it("submits a sales order on tenant A's site only", async () => {
    mockTenant(COMPANY_A, { host: siteA.url, serviceKeyCipher: cipher(KEY_A.apiKey, KEY_A.apiSecret) });
    const bDocsBefore = [...siteB.docs.keys()];
    const bRequestsBefore = siteB.requests.length;

    await service.changeStatus(USER_A, META, "SO-A-001", "submitted");

    expect(siteA.requests.some((r) => r.method === "POST" && r.url.includes("/method/frappe.client.submit"))).toBe(true);
    expect([...siteB.docs.keys()]).toEqual(bDocsBefore);
    expect(siteB.requests).toHaveLength(bRequestsBefore);
  });
});
