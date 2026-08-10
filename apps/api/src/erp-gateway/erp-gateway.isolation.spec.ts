import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorCode } from "@amni/shared";
import { ErpClient, encryptServiceSecret, serializeServiceCredentials } from "@amni/erp";

import { ApiException } from "../common/api.exception";
import { ErpGatewayService } from "./erp-gateway.service";
import { startMockFrappeServer, type MockFrappeServer } from "./mock-frappe-server";

const mocks = vi.hoisted(() => ({
  membership: { findFirst: vi.fn() },
  eRPInstance: { findUnique: vi.fn(), findFirst: vi.fn() },
  auditLog: { create: vi.fn() },
}));

vi.mock("@amni/db", () => ({
  prisma: { membership: mocks.membership, eRPInstance: mocks.eRPInstance, auditLog: mocks.auditLog },
}));

const HEX_KEY = "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff";

const USER_A = { id: "user-a", email: "a@acme.com", role: "USER" };
const USER_B = { id: "user-b", email: "b@beta.com", role: "USER" };
const USER_NONE = { id: "user-none", email: "none@nowhere.com", role: "USER" };
const COMPANY_A = "company-a";
const COMPANY_B = "company-b";
const META = { ip: "127.0.0.1", requestId: "req-isolation" };

const KEY_A = { apiKey: "key-a", apiSecret: "secret-a" };
const KEY_B = { apiKey: "key-b", apiSecret: "secret-b" };

let siteA: MockFrappeServer;
let siteB: MockFrappeServer;
let service: ErpGatewayService;

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
      { name: "CUST-A-001", customer_name: "Acme Corp", territory: "US" },
      { name: "CUST-A-002", customer_name: "Acme North", territory: "CA" },
    ],
  });
  siteB = await startMockFrappeServer({
    apiKey: KEY_B.apiKey,
    apiSecret: KEY_B.apiSecret,
    docs: [{ name: "CUST-B-001", customer_name: "Beta Ltd", territory: "DE" }],
  });
  service = new ErpGatewayService();
});

afterAll(async () => {
  delete process.env.ENCRYPTION_KEY;
  await siteA.close();
  await siteB.close();
});

beforeEach(() => {
  mocks.membership.findFirst.mockReset();
  mocks.eRPInstance.findFirst.mockReset();
  mocks.auditLog.create.mockReset();
  mocks.auditLog.create.mockResolvedValue({ id: "audit-1" });
});

describe("ErpGatewayService tenant isolation", () => {
  it("reads resources from the tenant's own site using its own service account", async () => {
    mockTenant(COMPANY_A, { host: siteA.url, serviceKeyCipher: cipher(KEY_A.apiKey, KEY_A.apiSecret) });

    const doc = await service.get(USER_A, META, "Customer", "CUST-A-001");

    expect(doc).toMatchObject({ name: "CUST-A-001", customer_name: "Acme Corp" });
    expect(mocks.eRPInstance.findFirst).toHaveBeenCalledWith({
      where: { tenant: { companyId: COMPANY_A } },
      select: { host: true, serviceKeyCipher: true },
    });
    expect(siteA.requests.every((r) => r.authHeader === `token ${KEY_A.apiKey}:${KEY_A.apiSecret}`)).toBe(true);
    expect(siteB.requests).toHaveLength(0);
  });

  it("returns 404 (erp_not_found) when reading another tenant's resource by name and leaks nothing", async () => {
    mockTenant(COMPANY_A, { host: siteA.url, serviceKeyCipher: cipher(KEY_A.apiKey, KEY_A.apiSecret) });
    const beforeB = siteB.requests.length;

    await expect(service.get(USER_A, META, "Customer", "CUST-B-001")).rejects.toMatchObject({
      code: ErrorCode.ERP_NOT_FOUND,
    });

    expect(siteB.requests).toHaveLength(beforeB);
  });

  it("lists only the tenant's own resources", async () => {
    mockTenant(COMPANY_A, { host: siteA.url, serviceKeyCipher: cipher(KEY_A.apiKey, KEY_A.apiSecret) });

    const result = await service.list(USER_A, META, "Customer", { limitPageLength: 50 });

    expect(result.items.map((item) => item.name).sort()).toEqual(["CUST-A-001", "CUST-A-002"]);
    expect(result.items.some((item) => item.name === "CUST-B-001")).toBe(false);
  });

  it("creates on the tenant's own site only and audits with actor + company", async () => {
    mockTenant(COMPANY_A, { host: siteA.url, serviceKeyCipher: cipher(KEY_A.apiKey, KEY_A.apiSecret) });
    const bDocsBefore = [...siteB.docs.keys()];

    const created = await service.create(USER_A, META, "Customer", { customer_name: "Shared Co", name: "CUST-SHARED" });

    expect(siteA.docs.get("CUST-SHARED")).toBeDefined();
    expect([...siteB.docs.keys()]).toEqual(bDocsBefore);
    expect(mocks.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorId: USER_A.id,
          actorEmail: USER_A.email,
          companyId: COMPANY_A,
          action: "erp.create",
          resourceType: "Customer",
          resourceId: created.name,
          ip: META.ip,
          requestId: META.requestId,
        }),
      }),
    );
  });

  it("rejects the other tenant's service credentials on its site", async () => {
    const forged = new ErpClient({
      baseUrl: siteB.url,
      apiKey: KEY_A.apiKey,
      apiSecret: KEY_A.apiSecret,
      allowHost: "127.0.0.1",
    });

    await expect(forged.get("Customer", "CUST-B-001")).rejects.toMatchObject({
      code: ErrorCode.ERP_UNAUTHORIZED,
    });
  });

  it("forbids users with no workspace membership (403)", async () => {
    mocks.membership.findFirst.mockResolvedValue(null);

    await expectApiException(service.get(USER_NONE, META, "Customer", "CUST-A-001"), ErrorCode.FORBIDDEN, 403);
    expect(mocks.eRPInstance.findFirst).not.toHaveBeenCalled();
  });

  it("rejects when the tenant has no provisioned ERP instance", async () => {
    mockTenant("company-empty", null as unknown as { host: string; serviceKeyCipher: string });

    await expect(service.get(USER_A, META, "Customer", "CUST-A-001")).rejects.toMatchObject({
      code: ErrorCode.TENANT_NOT_READY,
    });
  });

  it("rejects when the tenant service account is not provisioned", async () => {
    mockTenant(COMPANY_B, { host: siteB.url, serviceKeyCipher: null });

    await expect(service.get(USER_B, META, "Customer", "CUST-B-001")).rejects.toMatchObject({
      code: ErrorCode.ERP_UNAUTHORIZED,
    });
  });

  it("dispatches submit vs update and audits the action", async () => {
    mockTenant(COMPANY_A, { host: siteA.url, serviceKeyCipher: cipher(KEY_A.apiKey, KEY_A.apiSecret) });
    siteA.docs.set("CUST-A-003", { name: "CUST-A-003", docstatus: 0 });

    const updated = await service.update(USER_A, META, "Customer", "CUST-A-003", "submit", {});

    expect(updated.name).toBe("CUST-A-003");
    expect(mocks.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "erp.update",
          resourceId: "CUST-A-003",
          metadata: { action: "submit" },
        }),
      }),
    );
  });
});
