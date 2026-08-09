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
  createSalesOrderInputSchema,
  salesOrderListQuerySchema,
  salesOrderStatusSchema,
  updateSalesOrderInputSchema,
  type SalesOrder,
  type SalesOrderListResponse,
} from "@amni/shared";

import { AuthGuard } from "../auth/auth.guard";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { SalesOrdersService } from "./sales-orders.service";
import type { SalesOrderOptions } from "./sales-orders.service";

const changeSalesOrderStatusInputSchema = z.object({ status: salesOrderStatusSchema });

@Controller("sales/orders")
@UseGuards(AuthGuard)
export class SalesOrdersController {
  constructor(private readonly salesOrders: SalesOrdersService) {}

  @Get("options")
  options(): SalesOrderOptions {
    return this.salesOrders.options();
  }

  @Get()
  list(@Query() query: unknown): SalesOrderListResponse {
    return this.salesOrders.list(salesOrderListQuerySchema.parse(query));
  }

  @Get(":code")
  detail(@Param("code") code: string): SalesOrder {
    return this.salesOrders.detail(code);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: unknown): SalesOrder {
    return this.salesOrders.create(createSalesOrderInputSchema.parse(body));
  }

  @Patch(":code/status")
  changeStatus(@Param("code") code: string, @Body() body: unknown): SalesOrder {
    return this.salesOrders.changeStatus(code, changeSalesOrderStatusInputSchema.parse(body));
  }

  @Patch(":code")
  update(@Param("code") code: string, @Body() body: unknown): SalesOrder {
    return this.salesOrders.update(code, updateSalesOrderInputSchema.parse(body));
  }

  @Delete(":code")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("code") code: string): void {
    this.salesOrders.remove(code);
  }
}
