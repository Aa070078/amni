import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { encryptServiceSecret, serializeServiceCredentials } from "@amni/erp";
import { ErrorCode } from "@amni/shared";

import { ErpGatewayService, type GatewayRequestMeta, type GatewayUser } from "../erp-gateway/erp-gateway.service";
import { startMockFrappeServer, type MockFrappeServer } from "../erp-gateway/mock-frappe-server";
import { PurchaseOrdersService } from "./purchase-orders.service";

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
    docs: [
      { name: "SUP-0001", doctype: "Supplier", supplier_name: "Northwind Traders", supplier_group: "Wholesale" },
      { name: "ITEM-A-001", doctype: "Item", item_code: "PRD-0001", item_name: "Desk", stock_uom: "pcs", standard_rate: 100 },
      {
        name: "PO-0001",
        doctype: "Purchase Order",
        supplier: "SUP-0001",
        supplier_name: "Northwind Traders",
        transaction_date: "2026-08-01",
        currency: "USD",
        grand_total: 200,
        status: "Submitted",
        docstatus: 1,
        items: [{ item_code: "PRD-0001", item_name: "Desk", qty: 2, rate: 100, amount: 200, uom: "pcs" }],
      },
    ],
  });
  siteB = await startMockFrappeServer({
    apiKey: KEY_B.apiKey,
    apiSecret: KEY_B.apiSecret,
    docs: [
      { name: "SUP-0001", doctype: "Supplier", supplier_name: "Northwind Traders", supplier_group: "Wholesale" },
      { name: "ITEM-B-001", doctype: "Item", item_code: "PRD-0001", item_name: "Desk", stock_uom: "pcs", standard_rate: 100 },
      {
        name: "PO-0001",
        doctype: "Purchase Order",
        supplier: "SUP-0001",
        supplier_name: "Northwind Traders",
        transaction_date: "2026-08-01",
        currency: "USD",
        grand_total: 200,
        status: "Submitted",
        docstatus: 1,
        items: [{ item_code: "PRD-0001", item_name: "Desk", qty: 2, rate: 100, amount: 200, uom: "pcs" }],
      },
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

describe("M5-005 purchase-orders service — ERP-backed tenant isolation", () => {
  it("creates a purchase order on the tenant's own site with the next code and audits it", async () => {
    mockCompanyErp("company-a", siteA);
    const bDocsBefore = [...siteB.docs.keys()];
    const bRequestsBefore = siteB.requests.length;

    const service = new PurchaseOrdersService(new ErpGatewayService());
    const created = await service.create(USER_A, META, {
      supplierCode: "SUP-0001",
      currency: "USD",
      items: [{ product: "PRD-0001", qty: 1, rate: 100 }],
    });

    expect(created.code).toBe("PO-0002");
    expect(created.supplier.code).toBe("SUP-0001");
    expect(created.supplier.name).toBe("Northwind Traders");
    expect(created.status).toBe("draft");
    expect([...siteA.docs.values()].some((d) => d.supplier === "SUP-0001" && Array.isArray(d.items))).toBe(true);
    expect([...siteB.docs.keys()]).toEqual(bDocsBefore);
    expect(siteB.requests).toHaveLength(bRequestsBefore);
    expect(mocks.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "erp.create", resourceType: "Purchase Order", resourceId: "PO-0002" }),
      }),
    );
  });

  it("resolves options from the tenant's own suppliers and items only", async () => {
    mockCompanyErp("company-a", siteA);
    await siteB.docs.set("ITEM-B-ONLY", { name: "ITEM-B-ONLY", doctype: "Item", item_code: "PRD-9999", item_name: "B-Only" });

    const service = new PurchaseOrdersService(new ErpGatewayService());
    const options = await service.options(USER_A, META);

    expect(options.suppliers.map((s) => s.code)).toEqual(["SUP-0001"]);
    expect(options.products.map((p) => p.code)).toEqual(["PRD-0001"]);
    expect(options.products[0]?.rate).toBe(100);
    expect(options.products.some((p) => p.code === "PRD-9999")).toBe(false);
  });

  it("lists only the tenant's own purchase orders", async () => {
    mockCompanyErp("company-b", siteB);

    const service = new PurchaseOrdersService(new ErpGatewayService());
    const result = await service.list(USER_B, META, { page: 1, pageSize: 20 });

    expect(result.meta.total).toBe(1);
    expect(result.items[0]?.code).toBe("PO-0001");
    expect(result.items[0]?.status).toBe("submitted");
    expect(result.items[0]?.items[0]).toMatchObject({ product: "PRD-0001", qty: 2, amount: 200 });
    expect(result.items[0]?.summary.total).toBe(200);
    expect(siteA.requests).toHaveLength(0);
  });

  it("returns 404 for an order code that exists only on the other tenant", async () => {
    mockCompanyErp("company-a", siteA);
    await siteA.docs.delete("PO-0099");
    await siteB.docs.delete("PO-0099");
    await siteB.docs.set("PO-0099", { name: "PO-0099", supplier: "SUP-0001", items: [], status: "Draft", docstatus: 0 });

    const service = new PurchaseOrdersService(new ErpGatewayService());
    await expect(service.detail(USER_A, META, "PO-0099")).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND, status: 404 });
  });

  it("submits a purchase order through the gateway action and audits it", async () => {
    mockCompanyErp("company-a", siteA);

    const service = new PurchaseOrdersService(new ErpGatewayService());
    const updated = await service.changeStatus(USER_A, META, "PO-0001", { status: "submitted" });

    expect(updated.code).toBe("PO-0001");
    expect(mocks.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "erp.update", resourceType: "Purchase Order", resourceId: "PO-0001" }),
      }),
    );
  });
});
