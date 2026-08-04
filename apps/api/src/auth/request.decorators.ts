import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import type { AuthenticatedRequest } from "./auth.guard";
import type { RequestMeta } from "./auth.service";

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  return req.user;
});

export const ReqMeta = createParamDecorator((_data: unknown, ctx: ExecutionContext): RequestMeta => {
  const req = ctx.switchToHttp().getRequest<Request>();
  const res = ctx.switchToHttp().getResponse<{ locals?: { requestId?: string } }>();
  const forwarded = req.headers["x-forwarded-for"]?.toString() ?? "";
  const forwardedIp = forwarded.split(",")[0]?.trim();
  const ip = forwardedIp || req.ip;
  return {
    ip,
    userAgent: (req.headers["user-agent"]?.toString() ?? undefined)?.slice(0, 500),
    refreshCookie: (req.cookies as Record<string, string> | undefined)?.["amni_refresh"],
    requestId: res.locals?.requestId,
  };
});
