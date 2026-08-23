import { describe, expect, it, vi } from "vitest";
import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ProductRole } from "@amni/shared";

import { AuthGuard, type AuthenticatedRequest } from "./auth.guard";
import { ACCESS_COOKIE } from "./tokens.service";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
}));

vi.mock("@amni/db", () => ({
  prisma: { user: { findUnique: mocks.findUnique } },
}));

function contextFor(request: Partial<AuthenticatedRequest>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => contextFor,
    getClass: () => AuthGuard,
  } as unknown as ExecutionContext;
}

describe("AuthGuard membership role", () => {
  it.each([
    ["OWNER", "MEMBER", ProductRole.ADMIN],
    ["ADMIN", "MEMBER", ProductRole.ADMIN],
    ["MEMBER", "ACCOUNTANT", ProductRole.ACCOUNTANT],
    ["MEMBER", "SALES", ProductRole.SALES],
    ["MEMBER", "INVENTORY", ProductRole.INVENTORY],
    ["MEMBER", "MEMBER", ProductRole.MEMBER],
  ] as const)("maps %s/%s memberships to %s dashboard access", async (platformRole, productRole, expectedRole) => {
    mocks.findUnique.mockResolvedValueOnce({
      id: "user-1",
      email: "person@acme.test",
      status: "ACTIVE",
      isPlatformAdmin: false,
      memberships: [{ platformRole, productRole, company: { id: "company-1", name: "Acme" } }],
    });
    const tokens = { verifyAccessToken: vi.fn(() => ({ sub: "user-1" })) };
    const guard = new AuthGuard(tokens as never, new Reflector());
    const request = {
      method: "GET",
      originalUrl: "/api/v1/dashboard/snapshot",
      cookies: { [ACCESS_COOKIE]: "access-token" },
    } as Partial<AuthenticatedRequest>;

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.user).toMatchObject({ role: expectedRole, companyId: "company-1", companyName: "Acme" });
  });

  it("blocks member mutations by default", async () => {
    mocks.findUnique.mockResolvedValueOnce({
      id: "user-1",
      email: "member@acme.test",
      status: "ACTIVE",
      isPlatformAdmin: false,
      memberships: [{ platformRole: "MEMBER", productRole: "MEMBER", company: { id: "company-1", name: "Acme" } }],
    });
    const tokens = { verifyAccessToken: vi.fn(() => ({ sub: "user-1" })) };
    const guard = new AuthGuard(tokens as never, new Reflector());
    const request = {
      method: "POST",
      cookies: { [ACCESS_COOKIE]: "access-token", amni_csrf: "csrf" },
      headers: { "x-csrf-token": "csrf" },
    } as Partial<AuthenticatedRequest>;

    await expect(guard.canActivate(contextFor(request))).rejects.toMatchObject({ code: "forbidden" });
  });

  it("allows specialists only into their assigned domain", async () => {
    mocks.findUnique.mockResolvedValue({ id: "user-1", email: "sales@acme.test", status: "ACTIVE", isPlatformAdmin: false, memberships: [{ platformRole: "MEMBER", productRole: "SALES", company: { id: "company-1", name: "Acme" } }] });
    const guard = new AuthGuard({ verifyAccessToken: vi.fn(() => ({ sub: "user-1" })) } as never, new Reflector());
    const allowed = { method: "GET", originalUrl: "/api/v1/sales/customers", cookies: { [ACCESS_COOKIE]: "access-token" } } as Partial<AuthenticatedRequest>;
    await expect(guard.canActivate(contextFor(allowed))).resolves.toBe(true);

    mocks.findUnique.mockResolvedValue({ id: "user-1", email: "sales@acme.test", status: "ACTIVE", isPlatformAdmin: false, memberships: [{ platformRole: "MEMBER", productRole: "SALES", company: { id: "company-1", name: "Acme" } }] });
    const denied = { method: "GET", originalUrl: "/api/v1/finance/accounting/accounts", cookies: { [ACCESS_COOKIE]: "access-token" } } as Partial<AuthenticatedRequest>;
    await expect(guard.canActivate(contextFor(denied))).rejects.toMatchObject({ status: 403 });
  });
});
