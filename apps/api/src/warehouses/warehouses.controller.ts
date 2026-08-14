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
import {
  createWarehouseInputSchema,
  updateWarehouseInputSchema,
  warehouseListQuerySchema,
  type Warehouse,
  type WarehouseDetail,
  type WarehouseListResponse,
} from "@amni/shared";

import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { metaFrom, userFrom } from "../common/request-context";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { WarehousesService } from "./warehouses.service";

@Controller("inventory/warehouses")
@UseGuards(AuthGuard)
export class WarehousesController {
  constructor(private readonly warehouses: WarehousesService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest, @Query() query: unknown): Promise<WarehouseListResponse> {
    return this.warehouses.list(userFrom(req), metaFrom(req), warehouseListQuerySchema.parse(query));
  }

  @Get(":code")
  detail(@Req() req: AuthenticatedRequest, @Param("code") code: string): Promise<WarehouseDetail> {
    return this.warehouses.detail(userFrom(req), metaFrom(req), code);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: AuthenticatedRequest, @Body() body: unknown): Promise<Warehouse> {
    return this.warehouses.create(userFrom(req), metaFrom(req), createWarehouseInputSchema.parse(body));
  }

  @Patch(":code")
  update(
    @Req() req: AuthenticatedRequest,
    @Param("code") code: string,
    @Body() body: unknown,
  ): Promise<Warehouse> {
    return this.warehouses.update(userFrom(req), metaFrom(req), code, updateWarehouseInputSchema.parse(body));
  }

  @Delete(":code")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() req: AuthenticatedRequest, @Param("code") code: string): Promise<void> {
    return this.warehouses.remove(userFrom(req), metaFrom(req), code);
  }
}
