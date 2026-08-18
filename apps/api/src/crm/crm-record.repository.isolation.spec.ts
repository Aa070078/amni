import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { encryptServiceSecret, serializeServiceCredentials } from "@amni/erp";
import type { CrmContact } from "@amni/shared";
import { ErpGatewayService, type GatewayRequestMeta, type GatewayUser } from "../erp-gateway/erp-gateway.service";
import { startMockFrappeServer, type MockFrappeServer } from "../erp-gateway/mock-frappe-server";
import { CrmRecordRepository } from "./crm-record.repository";

const mocks = vi.hoisted(() => ({ membership: { findFirst: vi.fn() }, eRPInstance: { findUnique: vi.fn(), findFirst: vi.fn() }, auditLog: { create: vi.fn() } }));
vi.mock("@amni/db", () => ({ prisma: { membership: mocks.membership, eRPInstance: mocks.eRPInstance, auditLog: mocks.auditLog } }));

const USER_A: GatewayUser = { id: "user-a", email: "a@acme.com", role: "owner" };
const META: GatewayRequestMeta = { requestId: "req-crm-isolation", ip: "127.0.0.1" };
const HEX_KEY = Buffer.alloc(32, 2).toString("hex");
const KEY_A = { apiKey: "crm-a", apiSecret: "secret-a" };
const KEY_B = { apiKey: "crm-b", apiSecret: "secret-b" };
let siteA: MockFrappeServer;
let siteB: MockFrappeServer;
let repository: CrmRecordRepository;

function cipher(credentials: typeof KEY_A): string { return encryptServiceSecret(serializeServiceCredentials(credentials.apiKey, credentials.apiSecret)); }
function crmDoc(code: string, email: string) { const payload: CrmContact = { code, firstName: code, email, isPrimary: false, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }; return { name: code, doctype: "Amni CRM Record", record_type: "contact", record_code: code, email, search_text: `${code} ${email}`, payload: JSON.stringify(payload) }; }

beforeAll(async () => {
  process.env.ENCRYPTION_KEY = HEX_KEY;
  siteA = await startMockFrappeServer({ ...KEY_A, docs: [crmDoc("CC-A", "a-contact@acme.com")] });
  siteB = await startMockFrappeServer({ ...KEY_B, docs: [crmDoc("CC-B", "b-contact@beta.com")] });
  repository = new CrmRecordRepository(new ErpGatewayService());
});

afterAll(async () => { delete process.env.ENCRYPTION_KEY; await siteA.close(); await siteB.close(); });

beforeEach(() => {
  mocks.membership.findFirst.mockReset().mockResolvedValue({ companyId: "company-a" });
  mocks.eRPInstance.findFirst.mockReset().mockResolvedValue({ host: siteA.url, serviceKeyCipher: cipher(KEY_A) });
  mocks.eRPInstance.findUnique.mockReset();
  mocks.auditLog.create.mockReset().mockResolvedValue({ id: "audit" });
});

describe("CrmRecordRepository tenant isolation", () => {
  it("lists and mutates records only on the membership-resolved ERP site", async () => {
    const bRequests = siteB.requests.length;
    const page = await repository.list<CrmContact>(USER_A, META, "contact", { pageLength: 20 });
    expect(page.items.map((item) => item.code)).toEqual(["CC-A"]);

    const created: CrmContact = { code: "CC-A2", firstName: "A2", email: "a2@acme.com", isPrimary: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await repository.create(USER_A, META, "contact", created.code, created, { email: created.email });
    expect(siteA.docs.has("CC-A2")).toBe(true);
    expect(siteB.docs.has("CC-A2")).toBe(false);
    expect(siteB.requests).toHaveLength(bRequests);
  });

  it("returns 404 for another tenant's record without contacting that tenant", async () => {
    const bRequests = siteB.requests.length;
    await expect(repository.get(USER_A, META, "contact", "CC-B")).rejects.toMatchObject({ status: 404 });
    expect(siteB.requests).toHaveLength(bRequests);
  });
});
