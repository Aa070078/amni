import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import {
  reportTypeSchema,
  type FinanceOverview,
  type FinancialReport,
  type ReportType,
} from "@amni/shared";

import { AuthGuard } from "../auth/auth.guard";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { FinanceService } from "./finance.service";

@Controller("finance")
@UseGuards(AuthGuard)
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get("overview")
  overview(): FinanceOverview {
    return this.finance.overview();
  }

  @Get("reports/:type")
  report(@Param("type") type: string): FinancialReport {
    const parsed = reportTypeSchema.parse(type);
    return this.finance.report(parsed as ReportType);
  }
}
