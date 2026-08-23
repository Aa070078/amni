import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import {
  ProductRole,
  type DashboardAlerts,
  type DashboardActivity,
  type DashboardOverview,
  type DashboardSnapshot,
} from "@amni/shared";

import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { metaFrom, userFrom } from "../common/request-context";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { DashboardService, resolveProductRole } from "./dashboard.service";

@Controller("dashboard")
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get("overview")
  overview(@Req() req: AuthenticatedRequest): Promise<DashboardOverview> {
    const role = resolveProductRole(req.user?.role) ?? ProductRole.MEMBER;
    return this.dashboard.overview(userFrom(req), metaFrom(req), role);
  }

  @Get("snapshot")
  snapshot(@Req() req: AuthenticatedRequest): Promise<DashboardSnapshot> {
    const role = resolveProductRole(req.user?.role) ?? ProductRole.MEMBER;
    return this.dashboard.snapshot(userFrom(req), metaFrom(req), role);
  }

  @Get("alerts")
  alerts(@Req() req: AuthenticatedRequest): Promise<DashboardAlerts> {
    const role = resolveProductRole(req.user?.role) ?? ProductRole.MEMBER;
    return this.dashboard.alerts(userFrom(req), metaFrom(req), role);
  }

  @Get("activity")
  activity(@Req() req: AuthenticatedRequest): Promise<DashboardActivity> {
    const role = resolveProductRole(req.user?.role) ?? ProductRole.MEMBER;
    return this.dashboard.activity(userFrom(req), metaFrom(req), role);
  }
}
