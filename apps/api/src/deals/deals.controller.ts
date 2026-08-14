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
import {
  createDealInputSchema,
  dealListQuerySchema,
  dealPipelineQuerySchema,
  moveDealStageInputSchema,
  updateDealInputSchema,
  type Deal,
  type DealDetail,
  type DealListResponse,
  type DealPipeline,
} from "@amni/shared";

import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { metaFrom, userFrom } from "../common/request-context";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { DealsService } from "./deals.service";

@Controller("sales/deals")
@UseGuards(AuthGuard)
export class DealsController {
  constructor(private readonly deals: DealsService) {}

  @Get("pipeline")
  pipeline(@Req() req: AuthenticatedRequest, @Query() query: unknown): Promise<DealPipeline> {
    return this.deals.pipeline(userFrom(req), metaFrom(req), dealPipelineQuerySchema.parse(query));
  }

  @Get()
  list(@Req() req: AuthenticatedRequest, @Query() query: unknown): Promise<DealListResponse> {
    return this.deals.list(userFrom(req), metaFrom(req), dealListQuerySchema.parse(query));
  }

  @Get(":code")
  detail(@Req() req: AuthenticatedRequest, @Param("code") code: string): Promise<DealDetail> {
    return this.deals.detail(userFrom(req), metaFrom(req), code);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: AuthenticatedRequest, @Body() body: unknown): Promise<Deal> {
    return this.deals.create(userFrom(req), metaFrom(req), createDealInputSchema.parse(body));
  }

  @Patch(":code/stage")
  moveStage(@Req() req: AuthenticatedRequest, @Param("code") code: string, @Body() body: unknown): Promise<Deal> {
    return this.deals.moveStage(userFrom(req), metaFrom(req), code, moveDealStageInputSchema.parse(body));
  }

  @Patch(":code")
  update(
    @Req() req: AuthenticatedRequest,
    @Param("code") code: string,
    @Body() body: unknown,
  ): Promise<Deal> {
    return this.deals.update(userFrom(req), metaFrom(req), code, updateDealInputSchema.parse(body));
  }

  @Delete(":code")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() req: AuthenticatedRequest, @Param("code") code: string): Promise<void> {
    return this.deals.remove(userFrom(req), metaFrom(req), code);
  }
}
