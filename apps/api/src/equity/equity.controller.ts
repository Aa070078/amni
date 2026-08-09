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

import { AuthGuard } from "../auth/auth.guard";
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
  overview(): EquityOverview {
    return this.equity.overview();
  }

  @Get("cap-table")
  capTable(): CapTableRow[] {
    return this.equity.capTable();
  }

  @Get("shareholders")
  listShareholders(@Query() query: unknown): ShareholderListResponse {
    return this.equity.listShareholders(shareholderListQuerySchema.parse(query));
  }

  @Get("shareholders/:code")
  shareholderDetail(@Param("code") code: string): Shareholder {
    return this.equity.detailShareholder(code);
  }

  @Post("shareholders")
  @HttpCode(HttpStatus.CREATED)
  createShareholder(@Body() body: unknown): Shareholder {
    return this.equity.createShareholder(createShareholderInputSchema.parse(body));
  }

  @Patch("shareholders/:code")
  updateShareholder(@Param("code") code: string, @Body() body: unknown): Shareholder {
    return this.equity.updateShareholder(code, updateShareholderInputSchema.parse(body));
  }

  @Delete("shareholders/:code")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeShareholder(@Param("code") code: string): void {
    this.equity.removeShareholder(code);
  }

  @Get("classes")
  listClasses(@Query() query: unknown): ShareClassListResponse {
    return this.equity.listClasses(shareClassListQuerySchema.parse(query));
  }

  @Get("classes/:code")
  classDetail(@Param("code") code: string): ShareClass {
    return this.equity.detailClass(code);
  }

  @Post("classes")
  @HttpCode(HttpStatus.CREATED)
  createClass(@Body() body: unknown): ShareClass {
    return this.equity.createClass(createShareClassInputSchema.parse(body));
  }

  @Patch("classes/:code/status")
  changeClassStatus(@Param("code") code: string, @Body() body: unknown): ShareClass {
    return this.equity.changeClassStatus(code, changeClassStatusInputSchema.parse(body));
  }

  @Patch("classes/:code")
  updateClass(@Param("code") code: string, @Body() body: unknown): ShareClass {
    return this.equity.updateClass(code, updateShareClassInputSchema.parse(body));
  }

  @Delete("classes/:code")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeClass(@Param("code") code: string): void {
    this.equity.removeClass(code);
  }

  @Get("rounds")
  listRounds(@Query() query: unknown): RoundListResponse {
    return this.equity.listRounds(roundListQuerySchema.parse(query));
  }

  @Get("rounds/:code")
  roundDetail(@Param("code") code: string): Round {
    return this.equity.detailRound(code);
  }

  @Post("rounds")
  @HttpCode(HttpStatus.CREATED)
  createRound(@Body() body: unknown): Round {
    return this.equity.createRound(createRoundInputSchema.parse(body));
  }

  @Patch("rounds/:code/status")
  changeRoundStatus(@Param("code") code: string, @Body() body: unknown): Round {
    return this.equity.changeRoundStatus(code, changeRoundStatusInputSchema.parse(body));
  }

  @Patch("rounds/:code")
  updateRound(@Param("code") code: string, @Body() body: unknown): Round {
    return this.equity.updateRound(code, updateRoundInputSchema.parse(body));
  }

  @Delete("rounds/:code")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeRound(@Param("code") code: string): void {
    this.equity.removeRound(code);
  }
}
