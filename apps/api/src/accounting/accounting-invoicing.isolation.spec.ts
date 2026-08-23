import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { encryptServiceSecret, serializeServiceCredentials } from "@amni/erp";
import { ErpGatewayService, type GatewayRequestMeta, type GatewayUser } from "../erp-gateway/erp-gateway.service";
import { startMockFrappeServer, type MockFrappeServer } from "../erp-gateway/mock-frappe-server";
import { InvoicingService } from "../invoicing/invoicing.service";
import { AccountingService } from "./accounting.service";

const mocks = vi.hoisted(() => ({ membership: { findFirst: vi.fn() }, eRPInstance: { findUnique: vi.fn(), findFirst: vi.fn() }, auditLog: { create: vi.fn() } }));
vi.mock("@amni/db", () => ({ prisma: { membership: mocks.membership, eRPInstance: mocks.eRPInstance, auditLog: mocks.auditLog } }));

const USER: GatewayUser = { id: "user-a", email: "owner@acme.test", role: "owner" };
const META: GatewayRequestMeta = { requestId: "req-accounting-isolation", ip: "127.0.0.1" };
const HEX_KEY = Buffer.alloc(32, 7).toString("hex");
const KEY_A = { apiKey: "finance-a", apiSecret: "secret-a" };
const KEY_B = { apiKey: "finance-b", apiSecret: "secret-b" };
const stamp = "2026-08-18T12:00:00.000Z";
let siteA: MockFrappeServer;
let siteB: MockFrappeServer;
let accounting: AccountingService;
let invoicing: InvoicingService;

function cipher(credentials: typeof KEY_A): string { return encryptServiceSecret(serializeServiceCredentials(credentials.apiKey, credentials.apiSecret)); }
function account(name: string, label: string, isGroup = 0) { return { name, doctype: "Account", account_name: label, root_type: "Asset", is_group: isGroup, creation: stamp, modified: stamp }; }
function invoice(name: string, customer: string) { return { name, doctype: "Sales Invoice", customer, customer_name: customer, posting_date: "2026-08-18", currency: "USD", grand_total: 200, outstanding_amount: 200, is_return: 0, docstatus: 1, items: [{ item_code: "ITEM-1", item_name: "Service", uom: "pcs", qty: 1, rate: 200 }], creation: stamp, modified: stamp }; }

beforeAll(async () => {
  process.env.ENCRYPTION_KEY = HEX_KEY;
  siteA = await startMockFrappeServer({ ...KEY_A, docs: [account("Assets - A", "Assets", 1), account("Cash - A", "Cash"), invoice("INV-A", "Customer A")] });
  siteB = await startMockFrappeServer({ ...KEY_B, docs: [account("Assets - B", "Assets", 1), account("Cash - B", "Cash"), invoice("INV-B", "Customer B")] });
  const gateway = new ErpGatewayService();
  accounting = new AccountingService(gateway);
  invoicing = new InvoicingService(gateway);
});

afterAll(async () => { delete process.env.ENCRYPTION_KEY; await siteA.close(); await siteB.close(); });

beforeEach(() => {
  mocks.membership.findFirst.mockReset().mockResolvedValue({ companyId: "company-a" });
  mocks.eRPInstance.findFirst.mockReset().mockResolvedValue({ host: siteA.url, serviceKeyCipher: cipher(KEY_A) });
  mocks.eRPInstance.findUnique.mockReset();
  mocks.auditLog.create.mockReset().mockResolvedValue({ id: "audit" });
});

describe("accounting and invoicing tenant isolation", () => {
  it("reads and mutates only the membership-resolved ERP site", async () => {
    const bRequests = siteB.requests.length;
    const accounts = await accounting.listAccounts(USER, META, { page: 1, pageSize: 20 });
    expect(accounts.items.map((item) => item.code)).toContain("Cash - A");
    expect(accounts.items.map((item) => item.code)).not.toContain("Cash - B");

    const credit = await invoicing.createCreditNote(USER, META, { invoiceCode: "INV-A", reason: "Tenant A credit", items: [{ product: "ITEM-1", qty: 1, rate: 25 }] });
    expect(siteA.docs.has(credit.code)).toBe(true);
    expect(siteB.docs.has(credit.code)).toBe(false);
    expect(siteB.requests).toHaveLength(bRequests);
  });

  it("cannot resolve another tenant's accounting or invoice document", async () => {
    const bRequests = siteB.requests.length;
    await expect(accounting.detailAccount(USER, META, "Cash - B")).rejects.toMatchObject({ status: 404 });
    await expect(invoicing.createCreditNote(USER, META, { invoiceCode: "INV-B", items: [{ product: "ITEM-1", qty: 1, rate: 25 }] })).rejects.toMatchObject({ status: 404 });
    expect(siteB.requests).toHaveLength(bRequests);
  });
});
