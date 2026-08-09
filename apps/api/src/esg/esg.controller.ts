import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { esgMetricsListQuerySchema, type EsgBoardMember, type EsgMetric, type EsgOverview, type EsgPolicy, type EsgReport } from "@amni/shared";

import { AuthGuard } from "../auth/auth.guard";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { EsgService } from "./esg.service";

@Controller("esg")
@UseGuards(AuthGuard)
export class EsgController {
  constructor(private readonly esg: EsgService) {}

  @Get("overview")
  overview(): EsgOverview {
    return this.esg.overview();
  }

  @Get("metrics")
  listMetrics(@Query() query: unknown): EsgMetric[] {
    return this.esg.listMetrics(esgMetricsListQuerySchema.parse(query));
  }

  @Get("metrics/:code")
  metricDetail(@Param("code") code: string): EsgMetric {
    return this.esg.metricDetail(code);
  }

  @Get("policies")
  listPolicies(): EsgPolicy[] {
    return this.esg.listPolicies();
  }

  @Get("policies/:code")
  policyDetail(@Param("code") code: string): EsgPolicy {
    return this.esg.policyDetail(code);
  }

  @Get("board")
  listBoard(): EsgBoardMember[] {
    return this.esg.listBoard();
  }

  @Get("reports")
  listReports(): EsgReport[] {
    return this.esg.listReports();
  }

  @Get("reports/:code")
  reportDetail(@Param("code") code: string): EsgReport {
    return this.esg.reportDetail(code);
  }
}
