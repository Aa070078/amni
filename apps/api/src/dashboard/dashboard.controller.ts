import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import {
  ProductRole,
  dashboardOverviewQuerySchema,
  type DashboardAlerts,
  type DashboardActivity,
  type DashboardOverview,
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
  overview(@Req() req: AuthenticatedRequest, @Query() query: unknown): Promise<DashboardOverview> {
    // The guard reports "USER" today; a real membership role wins once M3/M4
    // wire it, and the query param stays a preview fallback until then.
    const parsed = dashboardOverviewQuerySchema.safeParse(query);
    const queryRole = parsed.success ? parsed.data.role : undefined;
    const role = resolveProductRole(req.user?.role) ?? queryRole ?? ProductRole.ADMIN;
    return this.dashboard.overview(userFrom(req), metaFrom(req), role);
  }

  @Get("alerts")
  alerts(@Req() req: AuthenticatedRequest): Promise<DashboardAlerts> {
    return this.dashboard.alerts(userFrom(req), metaFrom(req));
  }

  @Get("activity")
  activity(@Req() req: AuthenticatedRequest): Promise<DashboardActivity> {
    return this.dashboard.activity(userFrom(req), metaFrom(req));
  }
}
