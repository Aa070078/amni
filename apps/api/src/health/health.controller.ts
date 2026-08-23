import { Controller, Get, Req, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { type HealthReport } from "./health.service";
import type { TenantHealthReport } from "./health.service";
import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { metaFrom, userFrom } from "../common/request-context";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { HealthService } from "./health.service";

@Controller("healthz")
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  check(): Promise<HealthReport> {
    return this.health.check();
  }

  @Get("live")
  live(): { status: "ok"; service: "amni-api"; time: string } {
    return { status: "ok", service: "amni-api", time: new Date().toISOString() };
  }

  @Get("ready")
  async ready(@Res({ passthrough: true }) response: Response): Promise<HealthReport> {
    const report = await this.health.check();
    if (report.status !== "ok") response.status(503);
    return report;
  }

  @Get("tenant")
  @UseGuards(AuthGuard)
  checkTenant(@Req() req: AuthenticatedRequest): Promise<TenantHealthReport> {
    return this.health.checkTenant(userFrom(req).id, metaFrom(req).requestId);
  }
}
