import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  ProductRole,
  dashboardOverviewQuerySchema,
  type DashboardAlerts,
  type DashboardActivity,
  type DashboardOverview,
} from "@amni/shared";

import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/request.decorators";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { DashboardService, resolveProductRole } from "./dashboard.service";

@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get("overview")
  @UseGuards(AuthGuard)
  overview(
    @Query() query: unknown,
    @CurrentUser() user: { id: string; email: string; role: string },
  ): DashboardOverview {
    // The guard reports "USER" today; a real membership role wins once M3/M4
    // wire it, and the query param stays a preview fallback until then.
    const parsed = dashboardOverviewQuerySchema.safeParse(query);
    const queryRole = parsed.success ? parsed.data.role : undefined;
    const role = resolveProductRole(user.role) ?? queryRole ?? ProductRole.ADMIN;
    return this.dashboard.overview(role);
  }

  @Get("alerts")
  @UseGuards(AuthGuard)
  alerts(): DashboardAlerts {
    return this.dashboard.alerts();
  }

  @Get("activity")
  @UseGuards(AuthGuard)
  activity(): DashboardActivity {
    return this.dashboard.activity();
  }
}
