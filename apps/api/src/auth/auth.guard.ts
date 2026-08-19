import { Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { Reflector } from "@nestjs/core";
import { prisma } from "@amni/db";
import type { Request } from "express";

import { ApiException } from "../common/api.exception";
import { ErrorCode, ProductRole, type ProductRole as ProductRoleValue } from "@amni/shared";
import { ACCESS_COOKIE, CSRF_COOKIE } from "./tokens.service";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { TokensService } from "./tokens.service";
import { ALLOW_MEMBER_MUTATION } from "./authorization.decorator";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: ProductRoleValue;
    isPlatformAdmin: boolean;
    companyId?: string;
    companyName?: string;
  };
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Authenticates via the httpOnly access-token cookie and, for any unsafe
 * method, enforces CSRF double-submit: the x-csrf-token header must match
 * the non-httpOnly amni_csrf cookie set at session issuance.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly tokens: TokensService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const accessToken = req.cookies?.[ACCESS_COOKIE];
    if (!accessToken) {
      throw new ApiException({
        code: ErrorCode.UNAUTHORIZED,
        status: 401,
        message: "Authentication required",
      });
    }

    let payload: { sub: string; email: string; type: "access" };
    try {
      payload = this.tokens.verifyAccessToken(accessToken);
    } catch {
      throw new ApiException({
        code: ErrorCode.UNAUTHORIZED,
        status: 401,
        message: "Invalid or expired session",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        status: true,
        isPlatformAdmin: true,
        memberships: {
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "asc" },
          take: 1,
          select: {
            platformRole: true,
            productRole: true,
            company: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!user || user.status !== "ACTIVE") {
      throw new ApiException({
        code: ErrorCode.UNAUTHORIZED,
        status: 401,
        message: "Account unavailable",
      });
    }

    const method = req.method ?? "GET";
    if (!SAFE_METHODS.has(method)) {
      const headerToken = req.headers["x-csrf-token"];
      const cookieToken = req.cookies?.[CSRF_COOKIE];
      if (!headerToken || !cookieToken || headerToken !== cookieToken) {
        throw new ApiException({
          code: ErrorCode.FORBIDDEN,
          status: 403,
          message: "CSRF token mismatch",
        });
      }
    }

    const membership = user.memberships[0];
    const role = membershipRole(membership);

    req.user = {
      id: user.id,
      email: user.email,
      role,
      isPlatformAdmin: user.isPlatformAdmin,
      companyId: membership?.company.id,
      companyName: membership?.company.name,
    };

    if (!user.isPlatformAdmin && !roleCanAccessPath(role, req.originalUrl ?? req.url ?? "")) {
      throw new ApiException({
        code: ErrorCode.FORBIDDEN,
        status: 403,
        message: "Your workspace role does not have access to this area",
      });
    }

    const memberMutationAllowed = this.reflector.getAllAndOverride<boolean>(ALLOW_MEMBER_MUTATION, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!SAFE_METHODS.has(method) && role === ProductRole.MEMBER && !user.isPlatformAdmin && !memberMutationAllowed) {
      throw new ApiException({
        code: ErrorCode.FORBIDDEN,
        status: 403,
        message: "This action requires a workspace administrator",
      });
    }
    return true;
  }
}

function membershipRole(membership?: { platformRole: string; productRole: string }): ProductRoleValue {
  if (!membership) return ProductRole.MEMBER;
  if (membership.platformRole === "OWNER" || membership.platformRole === "ADMIN") return ProductRole.ADMIN;
  const role = membership.productRole.toLowerCase();
  return Object.values(ProductRole).includes(role as ProductRoleValue) ? role as ProductRoleValue : ProductRole.MEMBER;
}

export function roleCanAccessPath(role: ProductRoleValue, rawPath: string): boolean {
  if (role === ProductRole.ADMIN) return true;
  const path = rawPath.split("?", 1)[0]?.replace(/^\/api\/v1/, "") ?? "";
  if (path.startsWith("/dashboard") || path.startsWith("/notifications") || path.startsWith("/hrms") || path.startsWith("/auth")) return true;
  if (path.startsWith("/search") || path.startsWith("/healthz/tenant")) return true;
  if (path.startsWith("/settings/profile")) return true;
  if (role === ProductRole.SALES) return path.startsWith("/sales") || path.startsWith("/crm") || path.startsWith("/people");
  if (role === ProductRole.INVENTORY) return path.startsWith("/inventory") || path.startsWith("/purchasing");
  if (role === ProductRole.ACCOUNTANT) return path.startsWith("/finance");
  return false;
}
