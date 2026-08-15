import { Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common";
import { ErrorCode } from "@amni/shared";

import { ApiException } from "../common/api.exception";
import type { AuthenticatedRequest } from "../auth/auth.guard";

/**
 * Composes after AuthGuard. Grants access only to platform admins
 * (User.isPlatformAdmin). Rejects members with a 403 before any
 * platform-level data is touched.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!req.user?.isPlatformAdmin) {
      throw new ApiException({
        code: ErrorCode.FORBIDDEN,
        status: 403,
        message: "Platform admin access required",
      });
    }
    return true;
  }
}
