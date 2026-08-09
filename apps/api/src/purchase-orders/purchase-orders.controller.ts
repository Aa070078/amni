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
  options(): PurchaseOrderOptions {
    return this.purchaseOrders.options();
  }

  @Get()
  list(@Query() query: unknown): PurchaseOrderListResponse {
    return this.purchaseOrders.list(purchaseOrderListQuerySchema.parse(query));
  }

  @Get(":code")
  detail(@Param("code") code: string): PurchaseOrder {
    return this.purchaseOrders.detail(code);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: unknown): PurchaseOrder {
    return this.purchaseOrders.create(createPurchaseOrderInputSchema.parse(body));
  }

  @Patch(":code/status")
  changeStatus(@Param("code") code: string, @Body() body: unknown): PurchaseOrder {
    return this.purchaseOrders.changeStatus(code, changePurchaseOrderStatusInputSchema.parse(body));
  }

  @Patch(":code")
  update(@Param("code") code: string, @Body() body: unknown): PurchaseOrder {
    return this.purchaseOrders.update(code, updatePurchaseOrderInputSchema.parse(body));
  }

  @Delete(":code")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("code") code: string): void {
    this.purchaseOrders.remove(code);
  }
}
