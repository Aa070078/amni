import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import {
  createSalesCustomerSchema,
  salesCustomerListQuerySchema,
  updateSalesCustomerSchema,
  type SalesCustomer,
  type SalesCustomerDetail,
  type SalesCustomerListResponse,
} from "@amni/shared";

import { AuthGuard } from "../auth/auth.guard";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { SalesService } from "./sales.service";

@Controller("sales/customers")
@UseGuards(AuthGuard)
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @Get()
  list(@Query() query: unknown): SalesCustomerListResponse {
    return this.sales.list(salesCustomerListQuerySchema.parse(query));
  }

  @Get(":id")
  detail(@Param("id") id: string): SalesCustomerDetail {
    return this.sales.getById(id);
  }

  @Post()
  create(@Body() body: unknown): SalesCustomer {
    return this.sales.create(createSalesCustomerSchema.parse(body));
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: unknown): SalesCustomer {
    return this.sales.update(id, updateSalesCustomerSchema.parse(body));
  }
}
