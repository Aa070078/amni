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
  createPurchaseOrderInputSchema,
  purchaseOrderListQuerySchema,
  purchaseOrderStatusSchema,
  updatePurchaseOrderInputSchema,
  type PurchaseOrder,
  type PurchaseOrderListResponse,
} from "@amni/shared";

import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser, ReqMeta } from "../auth/request.decorators";
import type { RequestMeta } from "../auth/auth.service";
import type { GatewayUser } from "../erp-gateway/erp-gateway.service";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { PurchaseOrdersService } from "./purchase-orders.service";
import type { PurchaseOrderOptions } from "./purchase-orders.service";

const changePurchaseOrderStatusInputSchema = z.object({ status: purchaseOrderStatusSchema });

@Controller("purchasing/orders")
@UseGuards(AuthGuard)
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrders: PurchaseOrdersService) {}

  @Get("options")
  options(@CurrentUser() user: GatewayUser, @ReqMeta() meta: RequestMeta): Promise<PurchaseOrderOptions> {
    return this.purchaseOrders.options(user, meta);
  }

  @Get()
  list(@CurrentUser() user: GatewayUser, @ReqMeta() meta: RequestMeta, @Query() query: unknown): Promise<PurchaseOrderListResponse> {
    return this.purchaseOrders.list(user, meta, purchaseOrderListQuerySchema.parse(query));
  }

  @Get(":code")
  detail(@CurrentUser() user: GatewayUser, @ReqMeta() meta: RequestMeta, @Param("code") code: string): Promise<PurchaseOrder> {
    return this.purchaseOrders.detail(user, meta, code);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: GatewayUser, @ReqMeta() meta: RequestMeta, @Body() body: unknown): Promise<PurchaseOrder> {
    return this.purchaseOrders.create(user, meta, createPurchaseOrderInputSchema.parse(body));
  }

  @Patch(":code/status")
  changeStatus(
    @CurrentUser() user: GatewayUser,
    @ReqMeta() meta: RequestMeta,
    @Param("code") code: string,
    @Body() body: unknown,
  ): Promise<PurchaseOrder> {
    return this.purchaseOrders.changeStatus(user, meta, code, changePurchaseOrderStatusInputSchema.parse(body));
  }

  @Patch(":code")
  update(
    @CurrentUser() user: GatewayUser,
    @ReqMeta() meta: RequestMeta,
    @Param("code") code: string,
    @Body() body: unknown,
  ): Promise<PurchaseOrder> {
    return this.purchaseOrders.update(user, meta, code, updatePurchaseOrderInputSchema.parse(body));
  }

  @Delete(":code")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: GatewayUser, @ReqMeta() meta: RequestMeta, @Param("code") code: string): Promise<void> {
    return this.purchaseOrders.remove(user, meta, code);
  }
}
