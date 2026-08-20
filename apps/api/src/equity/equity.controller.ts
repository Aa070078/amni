import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import {
  createRoundInputSchema,
  createShareClassInputSchema,
  createShareholderInputSchema,
  roundListQuerySchema,
  roundStatusSchema,
  shareClassListQuerySchema,
  shareClassStatusSchema,
  shareholderListQuerySchema,
  updateRoundInputSchema,
  updateShareClassInputSchema,
  updateShareholderInputSchema,
  type CapTableRow,
  type EquityOverview,
  type Round,
  type RoundListResponse,
  type ShareClass,
  type ShareClassListResponse,
  type Shareholder,
  type ShareholderListResponse,
} from "@amni/shared";

import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { metaFrom, userFrom } from "../common/request-context";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { EquityService } from "./equity.service";

const changeClassStatusInputSchema = z.object({ status: shareClassStatusSchema });
const changeRoundStatusInputSchema = z.object({ status: roundStatusSchema });

@Controller("equity")
@UseGuards(AuthGuard)
export class EquityController {
  constructor(private readonly equity: EquityService) {}

  @Get("overview")
  overview(@Req() req: AuthenticatedRequest): Promise<EquityOverview> {
    return this.equity.overview(userFrom(req), metaFrom(req));
  }

  @Get("cap-table")
  capTable(@Req() req: AuthenticatedRequest): Promise<CapTableRow[]> {
    return this.equity.capTable(userFrom(req), metaFrom(req));
  }

  @Get("shareholders")
  listShareholders(@Req() req: AuthenticatedRequest, @Query() query: unknown): Promise<ShareholderListResponse> {
    return this.equity.listShareholders(userFrom(req), metaFrom(req), shareholderListQuerySchema.parse(query));
  }

  @Get("shareholders/:code")
  shareholderDetail(@Req() req: AuthenticatedRequest, @Param("code") code: string): Promise<Shareholder> {
    return this.equity.detailShareholder(userFrom(req), metaFrom(req), code);
  }

  @Post("shareholders")
  @HttpCode(HttpStatus.CREATED)
  createShareholder(@Req() req: AuthenticatedRequest, @Body() body: unknown): Promise<Shareholder> {
    return this.equity.createShareholder(userFrom(req), metaFrom(req), createShareholderInputSchema.parse(body));
  }

  @Patch("shareholders/:code")
  updateShareholder(@Req() req: AuthenticatedRequest, @Param("code") code: string, @Body() body: unknown): Promise<Shareholder> {
    return this.equity.updateShareholder(userFrom(req), metaFrom(req), code, updateShareholderInputSchema.parse(body));
  }

  @Delete("shareholders/:code")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeShareholder(@Req() req: AuthenticatedRequest, @Param("code") code: string): Promise<void> {
    return this.equity.removeShareholder(userFrom(req), metaFrom(req), code);
  }

  @Get("classes")
  listClasses(@Req() req: AuthenticatedRequest, @Query() query: unknown): Promise<ShareClassListResponse> {
    return this.equity.listClasses(userFrom(req), metaFrom(req), shareClassListQuerySchema.parse(query));
  }

  @Get("classes/:code")
  classDetail(@Req() req: AuthenticatedRequest, @Param("code") code: string): Promise<ShareClass> {
    return this.equity.detailClass(userFrom(req), metaFrom(req), code);
  }

  @Post("classes")
  @HttpCode(HttpStatus.CREATED)
  createClass(@Req() req: AuthenticatedRequest, @Body() body: unknown): Promise<ShareClass> {
    return this.equity.createClass(userFrom(req), metaFrom(req), createShareClassInputSchema.parse(body));
  }

  @Patch("classes/:code/status")
  changeClassStatus(@Req() req: AuthenticatedRequest, @Param("code") code: string, @Body() body: unknown): Promise<ShareClass> {
    return this.equity.changeClassStatus(userFrom(req), metaFrom(req), code, changeClassStatusInputSchema.parse(body));
  }

  @Patch("classes/:code")
  updateClass(@Req() req: AuthenticatedRequest, @Param("code") code: string, @Body() body: unknown): Promise<ShareClass> {
    return this.equity.updateClass(userFrom(req), metaFrom(req), code, updateShareClassInputSchema.parse(body));
  }

  @Delete("classes/:code")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeClass(@Req() req: AuthenticatedRequest, @Param("code") code: string): Promise<void> {
    return this.equity.removeClass(userFrom(req), metaFrom(req), code);
  }

  @Get("rounds")
  listRounds(@Req() req: AuthenticatedRequest, @Query() query: unknown): Promise<RoundListResponse> {
    return this.equity.listRounds(userFrom(req), metaFrom(req), roundListQuerySchema.parse(query));
  }

  @Get("rounds/:code")
  roundDetail(@Req() req: AuthenticatedRequest, @Param("code") code: string): Promise<Round> {
    return this.equity.detailRound(userFrom(req), metaFrom(req), code);
  }

  @Post("rounds")
  @HttpCode(HttpStatus.CREATED)
  createRound(@Req() req: AuthenticatedRequest, @Body() body: unknown): Promise<Round> {
    return this.equity.createRound(userFrom(req), metaFrom(req), createRoundInputSchema.parse(body));
  }

  @Patch("rounds/:code/status")
  changeRoundStatus(@Req() req: AuthenticatedRequest, @Param("code") code: string, @Body() body: unknown): Promise<Round> {
    return this.equity.changeRoundStatus(userFrom(req), metaFrom(req), code, changeRoundStatusInputSchema.parse(body));
  }

  @Patch("rounds/:code")
  updateRound(@Req() req: AuthenticatedRequest, @Param("code") code: string, @Body() body: unknown): Promise<Round> {
    return this.equity.updateRound(userFrom(req), metaFrom(req), code, updateRoundInputSchema.parse(body));
  }

  @Delete("rounds/:code")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeRound(@Req() req: AuthenticatedRequest, @Param("code") code: string): Promise<void> {
    return this.equity.removeRound(userFrom(req), metaFrom(req), code);
  }
}
