import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorCode } from "@amni/shared";

import { ApiException } from "../common/api.exception";
import { ErpGatewayService, type GatewayRequestMeta, type GatewayUser } from "./erp-gateway.service";

const mocks = vi.hoisted(() => {
  const client = {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    submit: vi.fn(),
    cancel: vi.fn(),
    delete: vi.fn(),
    call: vi.fn(),
  };
  return {
    membership: { findFirst: vi.fn() },
    auditLog: { create: vi.fn() },
    createErpClientForTenant: vi.fn(async () => client),
    client,
  };
});

vi.mock("@amni/db", () => ({
  prisma: { membership: mocks.membership, auditLog: mocks.auditLog },
}));

vi.mock("@amni/erp", () => ({ createErpClientForTenant: mocks.createErpClientForTenant }));

const USER: GatewayUser = { id: "user-1", email: "owner@acme.com", role: "USER" };
const META: GatewayRequestMeta = { ip: "10.0.0.1", requestId: "req-1" };
const COMPANY = "company-1";

describe("ErpGatewayService", () => {
  let service: ErpGatewayService;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createErpClientForTenant.mockResolvedValue(mocks.client);
    mocks.auditLog.create.mockResolvedValue({ id: "audit-1" });
    service = new ErpGatewayService();
  });

  function mockMembership() {
    mocks.membership.findFirst.mockResolvedValue({ companyId: COMPANY });
  }

  describe("scopeFor", () => {
    it("forbids users without a workspace membership", async () => {
      mocks.membership.findFirst.mockResolvedValue(null);

      try {
        await service.get(USER, META, "Customer", "C-1");
        expect.unreachable("expected ApiException");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiException);
        expect((err as ApiException).code).toBe(ErrorCode.FORBIDDEN);
        expect((err as ApiException).getStatus()).toBe(403);
      }
      expect(mocks.createErpClientForTenant).not.toHaveBeenCalled();
    });

    it("resolves the tenant client from the user's membership", async () => {
      mockMembership();
      mocks.client.get.mockResolvedValue({ name: "C-1" });

      await service.get(USER, META, "Customer", "C-1");

      expect(mocks.membership.findFirst).toHaveBeenCalledWith({
        where: { userId: USER.id },
        select: { companyId: true },
        orderBy: { createdAt: "asc" },
      });
      expect(mocks.createErpClientForTenant).toHaveBeenCalledWith({
        companyId: COMPANY,
        requestId: META.requestId,
      });
    });
  });

  describe("list", () => {
    it("forwards parsed options and returns items + hasMore", async () => {
      mockMembership();
      mocks.client.list.mockResolvedValue({ items: [{ name: "C-1" }], hasMore: false });

      const result = await service.list(USER, META, "Customer", {
        filters: { disabled: 0 },
        fields: ["name"],
        orderBy: "creation desc",
        limitPageLength: 10,
        start: 5,
      });

      expect(mocks.client.list).toHaveBeenCalledWith("Customer", {
        filters: { disabled: 0 },
        fields: ["name"],
        orderBy: "creation desc",
        limitPageLength: 10,
        start: 5,
      });
      expect(result).toEqual({ items: [{ name: "C-1" }], hasMore: false });
    });
  });

  describe("create", () => {
    it("creates the doc and audits with actor + company", async () => {
      mockMembership();
      mocks.client.create.mockResolvedValue({ name: "C-1", customer_name: "Acme" });

      const doc = await service.create(USER, META, "Customer", { customer_name: "Acme" });

      expect(mocks.client.create).toHaveBeenCalledWith("Customer", { customer_name: "Acme" });
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: USER.id,
          actorEmail: USER.email,
          companyId: COMPANY,
          action: "erp.create",
          resourceType: "Customer",
          resourceId: "C-1",
          metadata: undefined,
          ip: META.ip,
          requestId: META.requestId,
        },
      });
      expect(doc).toEqual({ name: "C-1", customer_name: "Acme" });
    });
  });

  describe("update", () => {
    it("dispatches submit, cancel and plain update to the right client calls", async () => {
      mockMembership();
      mocks.client.submit.mockResolvedValue({ name: "C-1", docstatus: 1 });
      mocks.client.cancel.mockResolvedValue({ name: "C-1", docstatus: 2 });
      mocks.client.update.mockResolvedValue({ name: "C-1", customer_name: "Acme Ltd" });

      await service.update(USER, META, "Customer", "C-1", "submit", {});
      expect(mocks.client.submit).toHaveBeenCalledWith("Customer", "C-1");
      expect(mocks.client.update).not.toHaveBeenCalled();

      await service.update(USER, META, "Customer", "C-1", "cancel", {});
      expect(mocks.client.cancel).toHaveBeenCalledWith("Customer", "C-1");

      await service.update(USER, META, "Customer", "C-1", undefined, { customer_name: "Acme Ltd" });
      expect(mocks.client.update).toHaveBeenCalledWith("Customer", "C-1", { customer_name: "Acme Ltd" });

      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "erp.update", resourceId: "C-1", metadata: { action: "submit" } }),
      });
    });
  });

  describe("remove", () => {
    it("deletes the doc and audits", async () => {
      mockMembership();

      await service.remove(USER, META, "Customer", "C-1");

      expect(mocks.client.delete).toHaveBeenCalledWith("Customer", "C-1");
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "erp.delete", resourceType: "Customer", resourceId: "C-1" }),
      });
    });
  });

  describe("call", () => {
    it("invokes the whitelisted method and audits it", async () => {
      mockMembership();
      mocks.client.call.mockResolvedValue({ ok: true });

      const result = await service.call(USER, META, "frappe.auth.get_logged_user", {});

      expect(mocks.client.call).toHaveBeenCalledWith("frappe.auth.get_logged_user", {});
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "erp.call", resourceType: "method", resourceId: "frappe.auth.get_logged_user" }),
      });
      expect(result).toEqual({ ok: true });
    });
  });

  it("propagates ErpError from the client unchanged", async () => {
    mockMembership();
    mocks.client.get.mockRejectedValue({ name: "ErpError", code: ErrorCode.ERP_NOT_FOUND, status: 404, message: "Missing" });

    await expect(service.get(USER, META, "Customer", "C-404")).rejects.toMatchObject({
      name: "ErpError",
      code: ErrorCode.ERP_NOT_FOUND,
      status: 404,
    });
    expect(mocks.auditLog.create).not.toHaveBeenCalled();
  });
});
