import type { Response } from "express";

import { ApiException } from "./api.exception";
import { ErrorCode } from "@amni/shared";
import type { AuthenticatedRequest } from "../auth/auth.guard";
import type { GatewayRequestMeta, GatewayUser } from "../erp-gateway/erp-gateway.service";

export function userFrom(req: AuthenticatedRequest): GatewayUser {
  if (!req.user) {
    throw new ApiException({ code: ErrorCode.UNAUTHORIZED, status: 401, message: "Authentication required" });
  }
  return req.user;
}

export function metaFrom(req: AuthenticatedRequest): GatewayRequestMeta {
  const locals = (req.res as Response | undefined)?.locals as { requestId?: string } | undefined;
  return { ip: req.ip, requestId: locals?.requestId };
}
