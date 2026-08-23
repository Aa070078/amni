import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { encryptServiceSecret, serializeServiceCredentials } from "@amni/erp";

import { ErpGatewayService, type GatewayRequestMeta, type GatewayUser } from "../erp-gateway/erp-gateway.service";
import { startMockFrappeServer, type MockFrappeServer } from "../erp-gateway/mock-frappe-server";
import { DomainRecordRepository } from "./domain-record.repository";

const mocks = vi.hoisted(() => ({ membership: { findFirst: vi.fn() }, eRPInstance: { findUnique: vi.fn(), findFirst: vi.fn() }, auditLog: { create: vi.fn() } }));
vi.mock("@amni/db", () => ({ prisma: { membership: mocks.membership, eRPInstance: mocks.eRPInstance, auditLog: mocks.auditLog } }));

const USER_A: GatewayUser = { id: "user-a", email: "a@acme.com", role: "owner" };
const META: GatewayRequestMeta = { requestId: "req-domain-isolation", ip: "127.0.0.1" };
const HEX_KEY = Buffer.alloc(32, 3).toString("hex");
const KEY_A = { apiKey: "domain-a", apiSecret: "secret-a" };
const KEY_B = { apiKey: "domain-b", apiSecret: "secret-b" };
let siteA: MockFrappeServer;
let siteB: MockFrappeServer;
let repository: DomainRecordRepository;

function cipher(credentials: typeof KEY_A): string { return encryptServiceSecret(serializeServiceCredentials(credentials.apiKey, credentials.apiSecret)); }
function domainDoc(code: string, title: string) { const payload = { code, title }; return { name: `equity:shareholder:${code}`, doctype: "Amni Domain Record", record_key: `equity:shareholder:${code}`, domain: "equity", record_type: "shareholder", record_code: code, title, search_text: `${code} ${title}`, payload: JSON.stringify(payload) }; }

beforeAll(async () => {
  process.env.ENCRYPTION_KEY = HEX_KEY;
  siteA = await startMockFrappeServer({ ...KEY_A, docs: [domainDoc("SH-A", "Tenant A")] });
  siteB = await startMockFrappeServer({ ...KEY_B, docs: [domainDoc("SH-B", "Tenant B")] });
  repository = new DomainRecordRepository(new ErpGatewayService());
});

afterAll(async () => { delete process.env.ENCRYPTION_KEY; await siteA.close(); await siteB.close(); });

beforeEach(() => {
  mocks.membership.findFirst.mockReset().mockResolvedValue({ companyId: "company-a" });
  mocks.eRPInstance.findFirst.mockReset().mockResolvedValue({ host: siteA.url, serviceKeyCipher: cipher(KEY_A) });
  mocks.eRPInstance.findUnique.mockReset();
  mocks.auditLog.create.mockReset().mockResolvedValue({ id: "audit" });
});

describe("DomainRecordRepository tenant isolation", () => {
  it("lists and mutates only the membership-resolved ERP site", async () => {
    const bRequests = siteB.requests.length;
    await expect(repository.list<{ code: string }>(USER_A, META, "equity", "shareholder", { pageLength: 20 })).resolves.toMatchObject({ items: [{ code: "SH-A" }] });
    await repository.create(USER_A, META, "sign", "template", "STMP-0001", { code: "STMP-0001", name: "NDA" }, { title: "NDA" });
    expect(siteA.docs.has("sign:template:STMP-0001")).toBe(true);
    expect(siteB.docs.has("sign:template:STMP-0001")).toBe(false);
    expect(siteB.requests).toHaveLength(bRequests);
    expect(mocks.auditLog.create).toHaveBeenCalledOnce();
  });

  it("cannot retrieve another tenant's record or contact its site", async () => {
    const bRequests = siteB.requests.length;
    await expect(repository.get(USER_A, META, "equity", "shareholder", "SH-B")).rejects.toMatchObject({ status: 404 });
    expect(siteB.requests).toHaveLength(bRequests);
  });
});
