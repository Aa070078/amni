import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Req, UseGuards } from "@nestjs/common";
import {
  createStockMovementInputSchema,
  stockMovementListQuerySchema,
  type StockMovement,
  type StockMovementListResponse,
} from "@amni/shared";

import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { metaFrom, userFrom } from "../common/request-context";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { StockMovementsService } from "./stock-movements.service";

@Controller("inventory/movements")
@UseGuards(AuthGuard)
export class StockMovementsController {
  constructor(private readonly stockMovements: StockMovementsService) {}

  @Get()
  list(
    @Req() req: AuthenticatedRequest,
    @Query() query: unknown,
  ): Promise<StockMovementListResponse> {
    return this.stockMovements.list(userFrom(req), metaFrom(req), stockMovementListQuerySchema.parse(query));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: AuthenticatedRequest, @Body() body: unknown): Promise<StockMovement> {
    return this.stockMovements.create(userFrom(req), metaFrom(req), createStockMovementInputSchema.parse(body));
  }
}
