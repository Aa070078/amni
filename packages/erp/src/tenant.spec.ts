import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorCode } from "@amni/shared";
import { encryptServiceSecret } from "./crypto.js";
import { createErpClientForTenant, resolveTenantErp } from "./tenant.js";

const mocks = vi.hoisted(() => ({
  eRPInstance: { findUnique: vi.fn(), findFirst: vi.fn() },
}));

vi.mock("@amni/db", () => ({ prisma: { eRPInstance: mocks.eRPInstance } }));

const HEX_KEY = "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff";

function encryptedCredentials(apiKey = "key-a", apiSecret = "secret-a"): string {
  return encryptServiceSecret(JSON.stringify({ apiKey, apiSecret }));
}

beforeEach(() => {
  process.env.ENCRYPTION_KEY = HEX_KEY;
  mocks.eRPInstance.findUnique.mockReset();
  mocks.eRPInstance.findFirst.mockReset();
});

afterEach(() => {
  delete process.env.ENCRYPTION_KEY;
});

describe("resolveTenantErp", () => {
  it("resolves a tenant by tenantId and pins its host for SSRF", async () => {
    mocks.eRPInstance.findUnique.mockResolvedValue({
      host: "acme.app.example.com",
      serviceKeyCipher: encryptedCredentials("key-a", "secret-a"),
    });
    const config = await resolveTenantErp({ tenantId: "tenant_1", requestId: "req-1" });

    expect(mocks.eRPInstance.findUnique).toHaveBeenCalledWith({
      where: { tenantId: "tenant_1" },
      select: { host: true, serviceKeyCipher: true },
    });
    expect(config).toMatchObject({
      baseUrl: "https://acme.app.example.com",
      apiKey: "key-a",
      apiSecret: "secret-a",
      requestId: "req-1",
      allowHost: "acme.app.example.com",
    });
  });

  it("resolves by companyId when no tenantId is given", async () => {
    mocks.eRPInstance.findFirst.mockResolvedValue({
      host: "https://beta.app.example.com",
      serviceKeyCipher: encryptedCredentials("key-b", "secret-b"),
    });
    const config = await resolveTenantErp({ companyId: "company_2" });

    expect(mocks.eRPInstance.findFirst).toHaveBeenCalledWith({
      where: { tenant: { companyId: "company_2" } },
      select: { host: true, serviceKeyCipher: true },
    });
    expect(config.baseUrl).toBe("https://beta.app.example.com");
    expect(config.apiKey).toBe("key-b");
  });

  it("treats a host without a scheme as https", async () => {
    mocks.eRPInstance.findUnique.mockResolvedValue({
      host: "gamma.app.example.com",
      serviceKeyCipher: encryptedCredentials(),
    });
    const config = await resolveTenantErp({ tenantId: "tenant_1" });
    expect(config.baseUrl).toBe("https://gamma.app.example.com");
  });

  it("throws TENANT_NOT_READY when no instance is provisioned", async () => {
    mocks.eRPInstance.findUnique.mockResolvedValue(null);
    await expect(resolveTenantErp({ tenantId: "tenant_1" })).rejects.toMatchObject({
      name: "ErpError",
      code: ErrorCode.TENANT_NOT_READY,
    });
  });

  it("throws TENANT_NOT_READY when neither tenantId nor companyId is given", async () => {
    await expect(resolveTenantErp({})).rejects.toMatchObject({
      code: ErrorCode.TENANT_NOT_READY,
    });
    expect(mocks.eRPInstance.findUnique).not.toHaveBeenCalled();
  });

  it("throws ERP_UNAUTHORIZED when the service account is not provisioned", async () => {
    mocks.eRPInstance.findUnique.mockResolvedValue({ host: "acme.app.example.com", serviceKeyCipher: null });
    await expect(resolveTenantErp({ tenantId: "tenant_1" })).rejects.toMatchObject({
      code: ErrorCode.ERP_UNAUTHORIZED,
    });
  });
});

describe("createErpClientForTenant", () => {
  it("returns a configured ErpClient", async () => {
    mocks.eRPInstance.findUnique.mockResolvedValue({
      host: "acme.app.example.com",
      serviceKeyCipher: encryptedCredentials("key-a", "secret-a"),
    });
    const client = await createErpClientForTenant({ tenantId: "tenant_1" });
    expect(client.baseUrlSafe).toBe("https://acme.app.example.com");
  });
});
