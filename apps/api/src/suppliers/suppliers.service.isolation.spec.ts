import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { encryptServiceSecret, serializeServiceCredentials } from "@amni/erp";
import { ErrorCode } from "@amni/shared";

import { ErpGatewayService, type GatewayRequestMeta, type GatewayUser } from "../erp-gateway/erp-gateway.service";
import { startMockFrappeServer, type MockFrappeServer } from "../erp-gateway/mock-frappe-server";
import { SuppliersService } from "./suppliers.service";

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

beforeAll(async () => {
  process.env.ENCRYPTION_KEY = HEX_KEY;
  siteA = await startMockFrappeServer({
    apiKey: KEY_A.apiKey,
    apiSecret: KEY_A.apiSecret,
    docs: [{ name: "SUP-0001", supplier_name: "Northwind Traders", supplier_group: "Wholesale" }],
  });
  siteB = await startMockFrappeServer({
    apiKey: KEY_B.apiKey,
    apiSecret: KEY_B.apiSecret,
    docs: [{ name: "SUP-0001", supplier_name: "Northwind Traders", supplier_group: "Wholesale" }],
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

describe("M5-005 suppliers service — ERP-backed tenant isolation", () => {
  it("creates a supplier on the tenant's own site with the next code and audits it", async () => {
    mockCompanyErp("company-a", siteA);
    const bDocsBefore = [...siteB.docs.keys()];
    const bRequestsBefore = siteB.requests.length;

    const service = new SuppliersService(new ErpGatewayService());
    const created = await service.create(USER_A, META, { name: "A-Only Traders", group: "General", status: "active" });

    expect(created.code).toBe("SUP-0002");
    expect(created.name).toBe("A-Only Traders");
    expect([...siteA.docs.values()].some((d) => d.supplier_name === "A-Only Traders")).toBe(true);
    expect([...siteB.docs.keys()]).toEqual(bDocsBefore);
    expect(siteB.requests).toHaveLength(bRequestsBefore);
    expect(mocks.auditLog.create).toHaveBeenCalledTimes(1);
    expect(mocks.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "erp.create", resourceType: "Supplier", resourceId: "SUP-0002" }),
      }),
    );
  });

  it("lists only the tenant's own suppliers even when names collide across tenants", async () => {
    mockCompanyErp("company-b", siteB);

    const service = new SuppliersService(new ErpGatewayService());
    const result = await service.list(USER_B, META, { page: 1, pageSize: 20 });

    expect(result.meta.total).toBe(1);
    expect(result.items[0]?.code).toBe("SUP-0001");
    expect(result.items[0]?.name).toBe("Northwind Traders");
    expect(result.items[0]?.group).toBe("Wholesale");
    expect(siteA.requests).toHaveLength(0);
  });

  it("returns 404 for a supplier code that exists only on the other tenant", async () => {
    mockCompanyErp("company-a", siteA);
    await siteA.docs.delete("SUP-0099");
    await siteB.docs.delete("SUP-0099");
    await siteB.docs.set("SUP-0099", { name: "SUP-0099", supplier_name: "B-Only" });

    const service = new SuppliersService(new ErpGatewayService());
    await expect(service.detail(USER_A, META, "SUP-0099")).rejects.toMatchObject({
      code: ErrorCode.NOT_FOUND,
      status: 404,
    });
  });

  it("maps the ERP doc back to the platform contract on detail", async () => {
    mockCompanyErp("company-a", siteA);

    const service = new SuppliersService(new ErpGatewayService());
    const supplier = await service.detail(USER_A, META, "SUP-0001");

    expect(supplier.code).toBe("SUP-0001");
    expect(supplier.name).toBe("Northwind Traders");
    expect(supplier.group).toBe("Wholesale");
    expect(supplier.status).toBe("active");
  });

  it("records a removed supplier against the acting user and company", async () => {
    mockCompanyErp("company-a", siteA);

    const service = new SuppliersService(new ErpGatewayService());
    await service.remove(USER_A, META, "SUP-0001");

    expect(siteA.docs.has("SUP-0001")).toBe(false);
    expect(mocks.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "erp.delete",
          resourceType: "Supplier",
          resourceId: "SUP-0001",
          companyId: "company-a",
        }),
      }),
    );
  });
});
