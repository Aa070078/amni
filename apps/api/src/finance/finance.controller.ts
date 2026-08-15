import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import {
  reportTypeSchema,
  type FinanceOverview,
  type FinancialReport,
  type ReportType,
} from "@amni/shared";

import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser, ReqMeta } from "../auth/request.decorators";
import type { RequestMeta } from "../auth/auth.service";
import type { GatewayUser } from "../erp-gateway/erp-gateway.service";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { FinanceService } from "./finance.service";

@Controller("finance")
@UseGuards(AuthGuard)
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get("overview")
  overview(@CurrentUser() user: GatewayUser, @ReqMeta() meta: RequestMeta): Promise<FinanceOverview> {
    return this.finance.overview(user, meta);
  }

  @Get("reports/:type")
  report(
    @CurrentUser() user: GatewayUser,
    @ReqMeta() meta: RequestMeta,
    @Param("type") type: string,
  ): Promise<FinancialReport> {
    const parsed = reportTypeSchema.parse(type);
    return this.finance.report(user, meta, parsed as ReportType);
  }
}
