import { prisma } from "@amni/db";
import { ErrorCode } from "@amni/shared";
import { ErpClient } from "./client.js";
import { decryptServiceSecret, parseServiceCredentials } from "./crypto.js";
import { ErpError } from "./errors.js";
import type { ErpClientConfig } from "./types.js";

const HTTPS_PREFIX = "https://";

export interface ResolveTenantErpOptions {
  tenantId?: string;
  companyId?: string;
  requestId?: string;
}

/**
 * Resolves the authenticated tenant's provisioned ERP instance to a ready
 * client config. The site URL and service keys come strictly from the
 * platform DB — never from client input — and the resolved host is pinned on
 * the config for SSRF defense (a caller cannot point the client elsewhere).
 *
 * Auth (tenant = session/membership, never client-supplied) is the gateway's
 * job; this helper only maps a known tenant to its service account.
 */
export async function resolveTenantErp(options: ResolveTenantErpOptions): Promise<ErpClientConfig> {
  const erpInstance = options.tenantId
    ? await prisma.eRPInstance.findUnique({
        where: { tenantId: options.tenantId },
        select: { host: true, serviceKeyCipher: true },
      })
    : options.companyId
      ? await prisma.eRPInstance.findFirst({
          where: { tenant: { companyId: options.companyId } },
          select: { host: true, serviceKeyCipher: true },
        })
      : null;

  if (!erpInstance) {
    throw new ErpError(ErrorCode.TENANT_NOT_READY, "No provisioned ERP instance for this tenant");
  }
  if (!erpInstance.serviceKeyCipher) {
    throw new ErpError(ErrorCode.ERP_UNAUTHORIZED, "Tenant ERP service account is not provisioned");
  }

  const credentials = parseServiceCredentials(decryptServiceSecret(erpInstance.serviceKeyCipher));
  const baseUrl = erpInstance.host.startsWith("http")
    ? erpInstance.host.replace(/\/+$/, "")
    : `${HTTPS_PREFIX}${erpInstance.host.replace(/\/+$/, "")}`;

  return {
    baseUrl,
    apiKey: credentials.apiKey,
    apiSecret: credentials.apiSecret,
    requestId: options.requestId,
    allowHost: new URL(baseUrl).hostname,
  };
}

export async function createErpClientForTenant(options: ResolveTenantErpOptions): Promise<ErpClient> {
  return new ErpClient(await resolveTenantErp(options));
}
