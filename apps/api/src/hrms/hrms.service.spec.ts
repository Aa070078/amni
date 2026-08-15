import { beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import type { ConfigService } from "@nestjs/config";

import { ErrorCode } from "@amni/shared";

import { HrmsService } from "./hrms.service";

const SECRET = "test-hrms-sso-secret-0123456789abcdef";

let tenantRecord: unknown;

vi.mock("@amni/db", () => ({
  prisma: {
    membership: {
      findFirst: vi.fn(async () => {
        if (!tenantRecord) return null;
        return { company: { tenant: tenantRecord } };
      }),
    },
  },
}));

const makeService = () => {
  const config = { get: (key: string) => (key === "HRMS_SSO_SECRET" ? SECRET : null) } as ConfigService;
  return new HrmsService(config);
};

describe("HrmsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tenantRecord = {
      id: "tenant-1",
      siteUrl: "https://demo-co.amni.dev",
      status: "ACTIVE",
      hrmsInstalled: true,
    };
  });

  describe("status", () => {
    it("reports unavailable when the user has no tenant", async () => {
      tenantRecord = null;
      const status = await makeService().status("user-1");
      expect(status).toMatchObject({ available: false, tenantActive: false });
    });

    it("reflects hrmsInstalled and tenant status", async () => {
      tenantRecord = { ...(tenantRecord as object), hrmsInstalled: false, status: "ACTIVE" };
      expect(await makeService().status("user-1")).toMatchObject({ available: false, tenantActive: true });
    });
  });

  describe("ssoUrl", () => {
    it("throws TENANT_NOT_READY without a tenant or when not active", async () => {
      tenantRecord = null;
      await expect(makeService().ssoUrl("u", "a@b.com", {})).rejects.toMatchObject({
        code: ErrorCode.TENANT_NOT_READY,
      });

      tenantRecord = { ...(tenantRecord ?? {}), status: "PROVISIONING" };
      await expect(makeService().ssoUrl("u", "a@b.com", {})).rejects.toMatchObject({
        code: ErrorCode.TENANT_NOT_READY,
      });
    });

    it("throws HRMS_NOT_INSTALLED when hrms is not provisioned", async () => {
      tenantRecord = { ...(tenantRecord as object), hrmsInstalled: false };
      await expect(makeService().ssoUrl("u", "a@b.com", {})).rejects.toMatchObject({
        code: ErrorCode.HRMS_NOT_INSTALLED,
      });
    });

    it("mints a token the bridge can verify and targets the tenant site", async () => {
      const result = await makeService().ssoUrl("user-1", "Mina@Example.com", { return: "/app/hrms/leave-application" });

      expect(result.siteUrl).toBe("https://demo-co.amni.dev");
      expect(result.tokenExpiresIn).toBe(120);

      const token = new URL(result.url).searchParams.get("token");
      expect(token).toBeTruthy();

      const decoded = jwt.verify(token as string, SECRET) as jwt.JwtPayload;
      expect(decoded.sub).toBe("mina@example.com");
      expect(decoded.aud).toBe("https://demo-co.amni.dev");
      expect(decoded.iss).toBe("amni-hrms");
      expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));

      const redirectTo = new URL(result.url).searchParams.get("redirect_to");
      expect(redirectTo).toBe("/app/hrms/leave-application");
    });

    it("defaults the desk path when no return path is given", async () => {
      const result = await makeService().ssoUrl("user-1", "a@b.com", {});
      const redirectTo = new URL(result.url).searchParams.get("redirect_to");
      expect(redirectTo).toBe("/app/hrms");
    });
  });
});
