import { describe, expect, it, vi } from "vitest";

import type { DomainRecordRepository } from "../common/domain-record.repository";
import { SignService } from "./sign.service";

const user = { id: "user-1", email: "owner@example.com", role: "owner" };
const meta = { requestId: "request-1" };

describe("SignService", () => {
  it("persists requests in the tenant ERP", async () => {
    const list = vi.fn().mockResolvedValue({ items: [], total: 0 });
    const create = vi.fn(async (_user, _meta, _domain, _type, _code, record) => record);
    const service = new SignService({ list, create } as unknown as DomainRecordRepository);
    const request = await service.createRequest(user, meta, { title: "NDA", documentType: "contract", signers: [{ name: "Client", email: "client@example.com", role: "Signer" }] });
    expect(request.code).toMatch(/^SIG-[A-Z0-9]{10}$/);
    expect(request.createdBy).toBe(user.email);
    expect(create).toHaveBeenCalledWith(user, meta, "sign", "request", request.code, request, expect.objectContaining({ title: "NDA" }));
  });

  it("persists both signer completion and its audit event", async () => {
    const request = { code: "SIG-0001", title: "NDA", documentType: "contract", status: "awaiting_signature", signers: [{ code: "S-0001", name: "Client", email: "client@example.com", status: "pending" }], createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z" };
    const get = vi.fn().mockResolvedValue(request);
    const update = vi.fn(async (_user, _meta, _domain, _type, _code, record) => record);
    const create = vi.fn(async (_user, _meta, _domain, _type, _code, record) => record);
    const service = new SignService({ get, update, create } as unknown as DomainRecordRepository);
    const saved = await service.markSignerSigned(user, meta, "SIG-0001", "S-0001");
    expect(saved.status).toBe("completed");
    expect(update).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledWith(user, meta, "sign", "audit", expect.any(String), expect.objectContaining({ event: "completed" }), expect.any(Object));
  });

  it("derives overview counts from persisted requests and templates", async () => {
    const list = vi.fn(async (_user, _meta, _domain, type) => ({ items: type === "request" ? [{ status: "awaiting_signature", signers: [{ status: "pending" }] }, { status: "completed", signers: [{ status: "signed" }] }] : [{ status: "active" }], total: 2 }));
    await expect(new SignService({ list } as unknown as DomainRecordRepository).overview(user, meta)).resolves.toMatchObject({ pendingForMe: 1, awaitingSignature: 1, completed: 1, templatesActive: 1 });
  });

  it("filters and paginates signing requests", async () => {
    const list = vi.fn().mockResolvedValue({ items: [{ code: "SIG-0001", title: "NDA", documentType: "contract", status: "draft", signers: [], createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }], total: 1 });
    const result = await new SignService({ list } as unknown as DomainRecordRepository).listRequests(user, meta, { page: 1, pageSize: 10, q: "nda", status: "draft" });
    expect(result.items).toHaveLength(1);
  });

  it("updates a request and resets supplied signers", async () => {
    const get = vi.fn().mockResolvedValue({ code: "SIG-0001", title: "NDA", documentType: "contract", status: "draft", signers: [], createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" });
    const update = vi.fn(async (_user, _meta, _domain, _type, _code, record) => record);
    const result = await new SignService({ get, update } as unknown as DomainRecordRepository).updateRequest(user, meta, "SIG-0001", { signers: [{ name: "Client", email: "client@example.com" }] });
    expect(result.signers[0]).toMatchObject({ code: "S-0001", status: "pending" });
  });

  it("declines a request and records the reason", async () => {
    const get = vi.fn().mockResolvedValue({ code: "SIG-0001", title: "NDA", documentType: "contract", status: "awaiting_signature", signers: [{ code: "S-0001", name: "Client", email: "client@example.com", status: "pending" }], createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" });
    const update = vi.fn(async (_user, _meta, _domain, _type, _code, record) => record);
    const create = vi.fn(async (_user, _meta, _domain, _type, _code, record) => record);
    const result = await new SignService({ get, update, create } as unknown as DomainRecordRepository).declineRequest(user, meta, "SIG-0001", { signerCode: "S-0001", reason: "Terms rejected" });
    expect(result.status).toBe("declined");
    expect(create).toHaveBeenCalledWith(user, meta, "sign", "audit", expect.any(String), expect.objectContaining({ detail: "Terms rejected" }), expect.any(Object));
  });

  it("rejects an unknown signer", async () => {
    const get = vi.fn().mockResolvedValue({ code: "SIG-0001", title: "NDA", documentType: "contract", status: "draft", signers: [], createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" });
    await expect(new SignService({ get } as unknown as DomainRecordRepository).markSignerSigned(user, meta, "SIG-0001", "S-9999")).rejects.toMatchObject({ status: 404 });
  });

  it("creates a reusable template with an opaque contract code", async () => {
    const create = vi.fn(async (_user, _meta, _domain, _type, _code, record) => record);
    const result = await new SignService({ create } as unknown as DomainRecordRepository).createTemplate(user, meta, { name: "NDA", documentType: "contract", signerRoles: ["Counterparty"] });
    expect(result.code).toMatch(/^STMP-[A-Z0-9]{10}$/);
    expect(result.version).toBe(1);
  });

  it("increments a template version on update", async () => {
    const get = vi.fn().mockResolvedValue({ code: "STMP-0001", name: "NDA", documentType: "contract", signerRoles: ["Client"], version: 1, status: "active", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" });
    const update = vi.fn(async (_user, _meta, _domain, _type, _code, record) => record);
    await expect(new SignService({ get, update } as unknown as DomainRecordRepository).updateTemplate(user, meta, "STMP-0001", { name: "Mutual NDA" })).resolves.toMatchObject({ name: "Mutual NDA", version: 2 });
  });

  it("archives a template durably", async () => {
    const get = vi.fn().mockResolvedValue({ code: "STMP-0001", name: "NDA", documentType: "contract", signerRoles: ["Client"], version: 1, status: "active", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" });
    const update = vi.fn(async (_user, _meta, _domain, _type, _code, record) => record);
    await expect(new SignService({ get, update } as unknown as DomainRecordRepository).changeTemplateStatus(user, meta, "STMP-0001", { status: "archived" })).resolves.toMatchObject({ status: "archived" });
  });

  it("searches the persisted audit trail newest first", async () => {
    const list = vi.fn().mockResolvedValue({ items: [{ id: "A1", requestCode: "SIG-0001", event: "sent", actor: "Owner", at: "2026-01-01T00:00:00.000Z" }, { id: "A2", requestCode: "SIG-0001", event: "signed", actor: "Client", at: "2026-01-02T00:00:00.000Z" }], total: 2 });
    const result = await new SignService({ list } as unknown as DomainRecordRepository).listAudit(user, meta, { page: 1, pageSize: 10, q: "sig-0001" });
    expect(result.items.map((item) => item.id)).toEqual(["A2", "A1"]);
  });
});
