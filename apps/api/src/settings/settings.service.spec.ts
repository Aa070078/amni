import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorCode } from "@amni/shared";

import { SettingsService } from "./settings.service";

const db = vi.hoisted(() => ({
  membership: { findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  invitation: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  company: { update: vi.fn() }, tenant: { update: vi.fn() }, user: { findUnique: vi.fn(), update: vi.fn() },
  subscription: { findFirst: vi.fn(), update: vi.fn() }, auditLog: { create: vi.fn() },
}));

vi.mock("@amni/db", () => ({ Prisma: {}, prisma: db }));

const actor = { id: "usr-1", email: "owner@example.com", role: "admin" as const, isPlatformAdmin: false };
const meta = { requestId: "req-1", ip: "127.0.0.1" };
const now = new Date("2026-08-01T00:00:00.000Z");
const mail = { enqueue: vi.fn(async () => undefined) };
const createService = (): SettingsService => new SettingsService(mail as never);

function company() {
  return {
    id: "company-1", name: "Demo Co.", legalName: "Demo Co. Ltd", slug: "demo-co", industry: "Services",
    country: "GB", taxId: null, address: null, email: "hello@example.com", phone: null, website: null,
    fiscalYearStart: null, createdAt: now, tenant: { id: "tenant-1", locale: { currency: "GBP", timezone: "Europe/London" } },
    memberships: [{ status: "ACTIVE" }],
    subscriptions: [{ id: "sub-1", status: "ACTIVE", billingPeriod: "MONTHLY", startsAt: now, trialEndsAt: null, endsAt: null,
      plan: { code: "growth", name: "Growth", price: { toNumber: () => 47 }, limits: { users: 10, storageGb: 50 }, features: { invoicing: true } } }],
  };
}

describe("SettingsService durable tenant settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.membership.findFirst.mockResolvedValue({ id: "mem-1", userId: actor.id, companyId: "company-1", platformRole: "OWNER", productRole: "ADMIN", status: "ACTIVE", createdAt: now, company: company() });
    db.membership.findMany.mockResolvedValue([{ id: "mem-1", platformRole: "OWNER", productRole: "ADMIN", status: "ACTIVE", createdAt: now, user: { email: actor.email, firstName: "Owner", lastName: null, lastLoginAt: now } }]);
    db.invitation.findMany.mockResolvedValue([]); db.invitation.findFirst.mockResolvedValue(null);
    db.user.findUnique.mockResolvedValue({ email: actor.email, firstName: "Owner", lastName: null, avatarUrl: null, jobTitle: "Founder", locale: {} });
    db.auditLog.create.mockResolvedValue({ id: "audit-1" });
  });

  it("reads the authenticated membership's company", async () => {
    await expect(createService().company(actor.id)).resolves.toMatchObject({ name: "Demo Co.", currency: "GBP" });
    expect(db.membership.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: actor.id, status: "ACTIVE" } }));
  });

  it("persists and audits company updates", async () => {
    db.company.update.mockResolvedValue({});
    await createService().updateCompany(actor, meta, { name: "Renamed" });
    expect(db.company.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "company-1" }, data: expect.objectContaining({ name: "Renamed" }) }));
    expect(db.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ companyId: "company-1", action: "settings.company.update" }) }));
  });

  it("combines durable memberships and invitations", async () => {
    db.invitation.findMany.mockResolvedValue([{ id: "inv-1", email: "sales@example.com", firstName: "Sam", lastName: null, platformRole: "MEMBER", productRole: "SALES", status: "PENDING", createdAt: now }]);
    await expect(createService().team(actor.id)).resolves.toMatchObject([{ role: "OWNER" }, { role: "SALES", status: "invited" }]);
  });

  it("creates a hashed tenant invitation and audit entry", async () => {
    db.user.findUnique.mockResolvedValue(null);
    db.invitation.create.mockImplementation(async ({ data }) => ({ id: "inv-1", ...data, createdAt: now, lastName: null }));
    const result = await createService().invite(actor, meta, { email: "sales@example.com", firstName: "Sam", role: "SALES" });
    expect(result).toMatchObject({ role: "SALES", status: "invited" });
    expect(db.invitation.create).toHaveBeenCalledWith({ data: expect.objectContaining({ companyId: "company-1", productRole: "SALES", tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/) }) });
    expect(mail.enqueue).toHaveBeenCalledWith(expect.objectContaining({ template: "invitation", to: "sales@example.com", token: expect.any(String) }));
  });

  it("removes an invitation whose email could not be queued so it can be retried", async () => {
    db.user.findUnique.mockResolvedValue(null);
    db.invitation.create.mockImplementation(async ({ data }) => ({ id: "inv-failed", ...data, createdAt: now, lastName: null }));
    mail.enqueue.mockRejectedValueOnce(new Error("redis unavailable"));
    await expect(createService().invite(actor, meta, { email: "retry@example.com", firstName: "Rae", role: "MEMBER" })).rejects.toMatchObject({ code: ErrorCode.INTERNAL, status: 503 });
    expect(db.invitation.delete).toHaveBeenCalledWith({ where: { id: "inv-failed" } });
  });

  it("refuses unsafe ownership assignment", async () => {
    await expect(createService().invite(actor, meta, { email: "new@example.com", firstName: "N", role: "OWNER" })).rejects.toMatchObject({ code: ErrorCode.UNPROCESSABLE });
  });

  it("derives the plan from the current subscription", async () => {
    await expect(createService().plan(actor.id)).resolves.toMatchObject({ plan: { code: "growth" }, seatsUsed: 1, billingPeriod: "monthly", status: "active" });
  });

  it("does not pretend an unconfigured integration is connected", () => {
    const service = createService();
    expect(service.integrations().every((item) => !item.connected)).toBe(true);
    expect(() => service.toggleIntegration("stripe")).toThrowError(expect.objectContaining({ code: ErrorCode.UNPROCESSABLE }));
  });

  it("persists profile edits", async () => {
    db.user.update.mockResolvedValue({});
    await createService().updateProfile(actor, { firstName: "Amara" });
    expect(db.user.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: actor.id }, data: expect.objectContaining({ firstName: "Amara" }) }));
  });
});
