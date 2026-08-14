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
  createSalesOrderInputSchema,
  salesOrderListQuerySchema,
  salesOrderStatusSchema,
  updateSalesOrderInputSchema,
  type SalesOrder,
  type SalesOrderListResponse,
} from "@amni/shared";

import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { metaFrom, userFrom } from "../common/request-context";
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
  options(@Req() req: AuthenticatedRequest): Promise<SalesOrderOptions> {
    return this.salesOrders.options(userFrom(req), metaFrom(req));
  }

  @Get()
  list(@Req() req: AuthenticatedRequest, @Query() query: unknown): Promise<SalesOrderListResponse> {
    return this.salesOrders.list(userFrom(req), metaFrom(req), salesOrderListQuerySchema.parse(query));
  }

  @Get(":code")
  detail(@Req() req: AuthenticatedRequest, @Param("code") code: string): Promise<SalesOrder> {
    return this.salesOrders.detail(userFrom(req), metaFrom(req), code);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: AuthenticatedRequest, @Body() body: unknown): Promise<SalesOrder> {
    return this.salesOrders.create(userFrom(req), metaFrom(req), createSalesOrderInputSchema.parse(body));
  }

  @Patch(":code/status")
  changeStatus(
    @Req() req: AuthenticatedRequest,
    @Param("code") code: string,
    @Body() body: unknown,
  ): Promise<SalesOrder> {
    return this.salesOrders.changeStatus(userFrom(req), metaFrom(req), code, changeSalesOrderStatusInputSchema.parse(body).status);
  }

  @Patch(":code")
  update(
    @Req() req: AuthenticatedRequest,
    @Param("code") code: string,
    @Body() body: unknown,
  ): Promise<SalesOrder> {
    return this.salesOrders.update(userFrom(req), metaFrom(req), code, updateSalesOrderInputSchema.parse(body));
  }

  @Delete(":code")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() req: AuthenticatedRequest, @Param("code") code: string): Promise<void> {
    return this.salesOrders.remove(userFrom(req), metaFrom(req), code);
  }
}
