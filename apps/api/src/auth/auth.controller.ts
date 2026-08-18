import { Body, Controller, Get, Post, Req, Res, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import type { z } from "zod";
import type { RequestMeta } from "./auth.service";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { AuthService } from "./auth.service";
import { AuthGuard, type AuthenticatedRequest } from "./auth.guard";
import { AllowMemberMutation } from "./authorization.decorator";
import { CurrentUser, ReqMeta } from "./request.decorators";
import {
  changePasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "@amni/shared";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  @Throttle({ default: { limit: 5, ttl: 60_000, blockDuration: 60_000 } })
  async register(@Body() body: unknown, @Res({ passthrough: true }) res: Response, @ReqMeta() meta: RequestMeta) {
    const input = registerSchema.parse(body);
    const result = await this.auth.register(input, res, meta);
    return { data: result };
  }

  @Post("login")
  @Throttle({ default: { limit: 10, ttl: 60_000, blockDuration: 60_000 } })
  async login(@Body() body: unknown, @Res({ passthrough: true }) res: Response, @ReqMeta() meta: RequestMeta) {
    const input = loginSchema.parse(body);
    const result = await this.auth.login(input, res, meta);
    return { data: result };
  }

  @Post("refresh")
  async refresh(@Body() body: unknown, @Res({ passthrough: true }) res: Response, @ReqMeta() meta: RequestMeta) {
    const parsed = refreshSchema.partial().parse(body ?? {});
    const result = await this.auth.refresh(parsed as z.infer<typeof refreshSchema> | undefined, res, meta);
    return { data: result };
  }

  @Post("logout")
  async logout(@Res({ passthrough: true }) res: Response, @ReqMeta() meta: RequestMeta) {
    await this.auth.logout(res, meta);
    return { data: { loggedOut: true } };
  }

  @Post("verify-email")
  async verifyEmail(@Body() body: unknown, @ReqMeta() meta: RequestMeta) {
    const input = verifyEmailSchema.parse(body);
    const result = await this.auth.verifyEmail(input, meta);
    return { data: result };
  }

  @Post("request-password-reset")
  @Throttle({ default: { limit: 3, ttl: 60_000, blockDuration: 60_000 } })
  async requestPasswordReset(@Body() body: unknown, @ReqMeta() meta: RequestMeta) {
    const input = requestPasswordResetSchema.parse(body);
    await this.auth.requestPasswordReset(input, meta);
    return { data: { ok: true } };
  }

  @Post("reset-password")
  @Throttle({ default: { limit: 5, ttl: 60_000, blockDuration: 60_000 } })
  async resetPassword(@Body() body: unknown, @ReqMeta() meta: RequestMeta) {
    const input = resetPasswordSchema.parse(body);
    await this.auth.resetPassword(input, meta);
    return { data: { ok: true } };
  }

  @Post("change-password")
  @UseGuards(AuthGuard)
  @AllowMemberMutation()
  async changePassword(@Body() body: unknown, @Req() req: AuthenticatedRequest, @ReqMeta() meta: RequestMeta) {
    const input = changePasswordSchema.parse(body);
    await this.auth.changePassword(input, req.user!.id, meta);
    return { data: { ok: true } };
  }

  @Get("me")
  @UseGuards(AuthGuard)
  async me(@CurrentUser() user: { id: string; email: string; role: string }) {
    const result = await this.auth.me(user.id);
    return { data: result };
  }
}
