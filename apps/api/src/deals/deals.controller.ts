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

import { AuthGuard } from "../auth/auth.guard";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { DealsService } from "./deals.service";

@Controller("sales/deals")
@UseGuards(AuthGuard)
export class DealsController {
  constructor(private readonly deals: DealsService) {}

  @Get("pipeline")
  pipeline(@Query() query: unknown): DealPipeline {
    return this.deals.pipeline(dealPipelineQuerySchema.parse(query));
  }

  @Get()
  list(@Query() query: unknown): DealListResponse {
    return this.deals.list(dealListQuerySchema.parse(query));
  }

  @Get(":code")
  detail(@Param("code") code: string): DealDetail {
    return this.deals.detail(code);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: unknown): Deal {
    return this.deals.create(createDealInputSchema.parse(body));
  }

  @Patch(":code/stage")
  moveStage(@Param("code") code: string, @Body() body: unknown): Deal {
    return this.deals.moveStage(code, moveDealStageInputSchema.parse(body));
  }

  @Patch(":code")
  update(@Param("code") code: string, @Body() body: unknown): Deal {
    return this.deals.update(code, updateDealInputSchema.parse(body));
  }

  @Delete(":code")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("code") code: string): void {
    this.deals.remove(code);
  }
}
