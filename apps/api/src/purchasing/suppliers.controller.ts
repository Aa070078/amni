import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import {
  supplierListQuerySchema,
  type SupplierDetail,
  type SupplierListResponse,
} from "@amni/shared";

import { AuthGuard } from "../auth/auth.guard";
import { parseQuery } from "../common/parse-query";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { SuppliersService } from "./suppliers.service";

@Controller("suppliers")
@UseGuards(AuthGuard)
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Get()
  list(@Query() query: unknown): SupplierListResponse {
    return this.suppliers.list(parseQuery(supplierListQuerySchema, query));
  }

  @Get(":id")
  detail(@Param("id") id: string): SupplierDetail {
    return this.suppliers.getById(id);
  }
}
