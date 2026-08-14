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
  createSupplierInputSchema,
  supplierListQuerySchema,
  updateSupplierInputSchema,
  type Supplier,
  type SupplierListResponse,
} from "@amni/shared";

import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser, ReqMeta } from "../auth/request.decorators";
import type { RequestMeta } from "../auth/auth.service";
import type { GatewayUser } from "../erp-gateway/erp-gateway.service";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { SuppliersService } from "./suppliers.service";

@Controller("purchasing/suppliers")
@UseGuards(AuthGuard)
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Get()
  list(@CurrentUser() user: GatewayUser, @ReqMeta() meta: RequestMeta, @Query() query: unknown): Promise<SupplierListResponse> {
    return this.suppliers.list(user, meta, supplierListQuerySchema.parse(query));
  }

  @Get(":code")
  detail(@CurrentUser() user: GatewayUser, @ReqMeta() meta: RequestMeta, @Param("code") code: string): Promise<Supplier> {
    return this.suppliers.detail(user, meta, code);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: GatewayUser, @ReqMeta() meta: RequestMeta, @Body() body: unknown): Promise<Supplier> {
    return this.suppliers.create(user, meta, createSupplierInputSchema.parse(body));
  }

  @Patch(":code")
  update(
    @CurrentUser() user: GatewayUser,
    @ReqMeta() meta: RequestMeta,
    @Param("code") code: string,
    @Body() body: unknown,
  ): Promise<Supplier> {
    return this.suppliers.update(user, meta, code, updateSupplierInputSchema.parse(body));
  }

  @Delete(":code")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: GatewayUser, @ReqMeta() meta: RequestMeta, @Param("code") code: string): Promise<void> {
    return this.suppliers.remove(user, meta, code);
  }
}
