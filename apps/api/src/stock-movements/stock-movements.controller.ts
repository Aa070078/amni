import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from "@nestjs/common";
import {
  createStockMovementInputSchema,
  stockMovementListQuerySchema,
  type StockMovement,
  type StockMovementListResponse,
} from "@amni/shared";

import { AuthGuard } from "../auth/auth.guard";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { StockMovementsService } from "./stock-movements.service";

@Controller("inventory/movements")
@UseGuards(AuthGuard)
export class StockMovementsController {
  constructor(private readonly stockMovements: StockMovementsService) {}

  @Get()
  list(@Query() query: unknown): StockMovementListResponse {
    return this.stockMovements.list(stockMovementListQuerySchema.parse(query));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: unknown): StockMovement {
    return this.stockMovements.create(createStockMovementInputSchema.parse(body));
  }
}
