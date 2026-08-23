import { Controller, Get, Param, Query, Req, UseGuards } from "@nestjs/common";
import { esgMetricsListQuerySchema, type EsgBoardMember, type EsgMetric, type EsgOverview, type EsgPolicy, type EsgReport } from "@amni/shared";

import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { metaFrom, userFrom } from "../common/request-context";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { EsgService } from "./esg.service";

@Controller("esg")
@UseGuards(AuthGuard)
export class EsgController {
  constructor(private readonly esg: EsgService) {}

  @Get("overview")
  overview(@Req() req: AuthenticatedRequest): Promise<EsgOverview> {
    return this.esg.overview(userFrom(req), metaFrom(req));
  }

  @Get("metrics")
  listMetrics(@Req() req: AuthenticatedRequest, @Query() query: unknown): Promise<EsgMetric[]> {
    return this.esg.listMetrics(userFrom(req), metaFrom(req), esgMetricsListQuerySchema.parse(query));
  }

  @Get("metrics/:code")
  metricDetail(@Req() req: AuthenticatedRequest, @Param("code") code: string): Promise<EsgMetric> {
    return this.esg.metricDetail(userFrom(req), metaFrom(req), code);
  }

  @Get("policies")
  listPolicies(@Req() req: AuthenticatedRequest): Promise<EsgPolicy[]> {
    return this.esg.listPolicies(userFrom(req), metaFrom(req));
  }

  @Get("policies/:code")
  policyDetail(@Req() req: AuthenticatedRequest, @Param("code") code: string): Promise<EsgPolicy> {
    return this.esg.policyDetail(userFrom(req), metaFrom(req), code);
  }

  @Get("board")
  listBoard(@Req() req: AuthenticatedRequest): Promise<EsgBoardMember[]> {
    return this.esg.listBoard(userFrom(req), metaFrom(req));
  }

  @Get("reports")
  listReports(@Req() req: AuthenticatedRequest): Promise<EsgReport[]> {
    return this.esg.listReports(userFrom(req), metaFrom(req));
  }

  @Get("reports/:code")
  reportDetail(@Req() req: AuthenticatedRequest, @Param("code") code: string): Promise<EsgReport> {
    return this.esg.reportDetail(userFrom(req), metaFrom(req), code);
  }
}
