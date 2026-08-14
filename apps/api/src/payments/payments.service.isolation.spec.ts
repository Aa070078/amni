import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { encryptServiceSecret, serializeServiceCredentials } from "@amni/erp";
import { ErrorCode } from "@amni/shared";

import { ErpGatewayService, type GatewayRequestMeta, type GatewayUser } from "../erp-gateway/erp-gateway.service";
import { startMockFrappeServer, type MockFrappeServer } from "../erp-gateway/mock-frappe-server";
import { PaymentsService } from "./payments.service";

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

function paymentDoc() {
  return {
    name: "PAY-0001",
    doctype: "Payment Entry",
    payment_type: "Pay",
    party_type: "Supplier",
    party: "Riverside Estates",
    posting_date: "2026-08-10",
    reference_no: "RENT-2026-07",
    bill_no: "PINV-0001",
    paid_amount: 4200,
    received_amount: 4200,
    mode_of_payment: "bank_transfer",
    docstatus: 1,
    creation: "2026-08-10T00:00:00.000Z",
    modified: "2026-08-10T00:00:00.000Z",
  };
}

beforeAll(async () => {
  process.env.ENCRYPTION_KEY = HEX_KEY;
  siteA = await startMockFrappeServer({
    apiKey: KEY_A.apiKey,
    apiSecret: KEY_A.apiSecret,
    docs: [paymentDoc()],
  });
  siteB = await startMockFrappeServer({
    apiKey: KEY_B.apiKey,
    apiSecret: KEY_B.apiSecret,
    docs: [paymentDoc()],
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

describe("M5-005 payments service — ERP-backed tenant isolation", () => {
  it("creates a cleared outgoing payment on the tenant's own site and audits it", async () => {
    mockCompanyErp("company-a", siteA);
    const bDocsBefore = [...siteB.docs.keys()];
    const bRequestsBefore = siteB.requests.length;

    const service = new PaymentsService(new ErpGatewayService());
    const created = await service.create(USER_A, META, {
      type: "outgoing",
      party: "Riverside Estates",
      reference: "RENT-2026-08",
      invoiceCode: "PINV-0001",
      amount: 4200,
    });

    expect(created.code).toBe("PAY-0002");
    expect(created.type).toBe("outgoing");
    expect(created.status).toBe("cleared");
    expect(created.amount).toBe(4200);
    expect(created.invoiceCode).toBe("PINV-0001");
    expect([...siteA.docs.values()].some((d) => d.name === "PAY-0002" && d.payment_type === "Pay" && d.bill_no === "PINV-0001")).toBe(true);
    expect([...siteB.docs.keys()]).toEqual(bDocsBefore);
    expect(siteB.requests).toHaveLength(bRequestsBefore);
    expect(mocks.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "erp.create", resourceType: "Payment Entry", resourceId: "PAY-0002" }),
      }),
    );
  });

  it("lists only the tenant's own payments", async () => {
    mockCompanyErp("company-b", siteB);

    const service = new PaymentsService(new ErpGatewayService());
    const result = await service.list(USER_B, META, { page: 1, pageSize: 20 });

    expect(result.meta.total).toBe(1);
    expect(result.items[0]?.code).toBe("PAY-0001");
    expect(result.items[0]?.status).toBe("cleared");
    expect(result.items[0]?.invoiceCode).toBe("PINV-0001");
    expect(siteA.requests).toHaveLength(0);
  });

  it("returns 404 for a payment that exists only on the other tenant", async () => {
    mockCompanyErp("company-a", siteA);
    await siteA.docs.delete("PAY-0099");
    await siteB.docs.delete("PAY-0099");
    await siteB.docs.set("PAY-0099", paymentDoc());

    const service = new PaymentsService(new ErpGatewayService());
    await expect(service.detail(USER_A, META, "PAY-0099")).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND, status: 404 });
  });

  it("maps a pending (draft) payment entry to pending status", async () => {
    mockCompanyErp("company-a", siteA);
    await siteA.docs.set("PAY-0003", { ...paymentDoc(), name: "PAY-0003", docstatus: 0 });

    const service = new PaymentsService(new ErpGatewayService());
    const result = await service.detail(USER_A, META, "PAY-0003");

    expect(result.status).toBe("pending");
  });
});
