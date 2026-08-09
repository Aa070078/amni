import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import {
  purchaseOrderListQuerySchema,
  type PurchaseOrderDetail,
  type PurchaseOrderListResponse,
} from "@amni/shared";

import { AuthGuard } from "../auth/auth.guard";
import { parseQuery } from "../common/parse-query";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { PurchaseOrdersService } from "./purchase-orders.service";

@Controller("purchase-orders")
@UseGuards(AuthGuard)
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrders: PurchaseOrdersService) {}

  @Get()
  list(@Query() query: unknown): PurchaseOrderListResponse {
    return this.purchaseOrders.list(parseQuery(purchaseOrderListQuerySchema, query));
  }

  @Get(":id")
  detail(@Param("id") id: string): PurchaseOrderDetail {
    return this.purchaseOrders.getById(id);
  }
}
