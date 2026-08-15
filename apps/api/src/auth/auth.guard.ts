import { Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common";
import { prisma } from "@amni/db";
import type { Request } from "express";

import { ApiException } from "../common/api.exception";
import { ErrorCode } from "@amni/shared";
import { ACCESS_COOKIE, CSRF_COOKIE } from "./tokens.service";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { TokensService } from "./tokens.service";

export interface AuthenticatedRequest extends Request {
  user?: { id: string; email: string; role: string; isPlatformAdmin: boolean };
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Authenticates via the httpOnly access-token cookie and, for any unsafe
 * method, enforces CSRF double-submit: the x-csrf-token header must match
 * the non-httpOnly amni_csrf cookie set at session issuance.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly tokens: TokensService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const accessToken = req.cookies?.[ACCESS_COOKIE];
    if (!accessToken) {
      throw new ApiException({ code: ErrorCode.UNAUTHORIZED, status: 401, message: "Authentication required" });
    }

    let payload: { sub: string; email: string; type: "access" };
    try {
      payload = this.tokens.verifyAccessToken(accessToken);
    } catch {
      throw new ApiException({ code: ErrorCode.UNAUTHORIZED, status: 401, message: "Invalid or expired session" });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, status: true, isPlatformAdmin: true },
    });
    if (!user || user.status !== "ACTIVE") {
      throw new ApiException({ code: ErrorCode.UNAUTHORIZED, status: 401, message: "Account unavailable" });
    }

    const method = req.method ?? "GET";
    if (!SAFE_METHODS.has(method)) {
      const headerToken = req.headers["x-csrf-token"];
      const cookieToken = req.cookies?.[CSRF_COOKIE];
      if (!headerToken || !cookieToken || headerToken !== cookieToken) {
        throw new ApiException({ code: ErrorCode.FORBIDDEN, status: 403, message: "CSRF token mismatch" });
      }
    }

    req.user = { id: user.id, email: user.email, role: "USER", isPlatformAdmin: user.isPlatformAdmin };
    return true;
  }
}
