import { Controller, Get, Req, UseGuards } from "@nestjs/common";
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

  @Get("tenant")
  @UseGuards(AuthGuard)
  checkTenant(@Req() req: AuthenticatedRequest): Promise<TenantHealthReport> {
    return this.health.checkTenant(userFrom(req).id, metaFrom(req).requestId);
  }
}
