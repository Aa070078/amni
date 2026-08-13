import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { prisma } from "@amni/db";
import jwt from "jsonwebtoken";

import { ApiException } from "../common/api.exception";
import { ErrorCode, type HrmsSsoUrlQuery, type HrmsSsoUrlResponse, type HrmsStatus } from "@amni/shared";

const HRMS_ISSUER = "amni-hrms";
const DEFAULT_TOKEN_TTL_SECONDS = 120;

/**
 * HRMS embed (SSO) — mints the short-lived JWT that `amni_bridge.api.login`
 * on the tenant site exchanges for a desk session. The API never touches the
 * tenant's ERP directly here: the tenant site URL comes from the platform DB
 * and the JWT is signed with the shared HRMS_SSO_SECRET.
 */
@Injectable()
export class HrmsService {
  private readonly secret: string;
  private readonly ttlSeconds: number;

  constructor(config: ConfigService) {
    const secret = config.get<string>("HRMS_SSO_SECRET");
    if (!secret) {
      throw new Error("HRMS_SSO_SECRET is required for the HRMS embed (see apps/api/.env.example)");
    }
    this.secret = secret;
    this.ttlSeconds = Number(config.get<string>("HRMS_SSO_TOKEN_TTL_SECONDS") ?? DEFAULT_TOKEN_TTL_SECONDS);
  }

  private async tenantFor(userId: string) {
    const membership = await prisma.membership.findFirst({
      where: { userId },
      include: { company: { include: { tenant: true } } },
    });
    return membership?.company?.tenant ?? null;
  }

  /** Read-only status so the UI can decide whether to render the desk. */
  async status(userId: string): Promise<HrmsStatus> {
    const tenant = await this.tenantFor(userId);
    if (!tenant) {
      return { available: false, tenantActive: false, deskPath: "/app/hrms" };
    }
    return {
      available: tenant.hrmsInstalled,
      tenantActive: tenant.status === "ACTIVE",
      siteUrl: tenant.siteUrl,
      deskPath: "/app/hrms",
    };
  }

  /** Mint an SSO sign-in URL for the current user's tenant site. */
  async ssoUrl(userId: string, userEmail: string, query: HrmsSsoUrlQuery): Promise<HrmsSsoUrlResponse> {
    const tenant = await this.tenantFor(userId);
    if (!tenant) {
      throw new ApiException({ code: ErrorCode.TENANT_NOT_READY, status: 409, message: "No workspace provisioned yet" });
    }
    if (tenant.status !== "ACTIVE") {
      throw new ApiException({ code: ErrorCode.TENANT_NOT_READY, status: 409, message: "Workspace is not ready yet" });
    }
    if (!tenant.hrmsInstalled) {
      throw new ApiException({
        code: ErrorCode.HRMS_NOT_INSTALLED,
        status: 409,
        message: "HRMS is not installed for this workspace",
      });
    }

    const now = Math.floor(Date.now() / 1000);
    const token = jwt.sign(
      {
        sub: userEmail.toLowerCase(),
        aud: tenant.siteUrl,
        iss: HRMS_ISSUER,
        iat: now,
        exp: now + this.ttlSeconds,
        jti: `${tenant.id}:${now}:${Math.random().toString(36).slice(2, 10)}`,
      },
      this.secret,
      { algorithm: "HS256" },
    );

    const returnPath = query.return ?? "/app/hrms";
    const url = `${tenant.siteUrl.replace(/\/+$/, "")}/api/method/amni_bridge.api.login?token=${encodeURIComponent(token)}&redirect_to=${encodeURIComponent(returnPath)}`;

    return { url, siteUrl: tenant.siteUrl, tokenExpiresIn: this.ttlSeconds };
  }
}
