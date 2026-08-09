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
  createWarehouseInputSchema,
  updateWarehouseInputSchema,
  warehouseListQuerySchema,
  type Warehouse,
  type WarehouseDetail,
  type WarehouseListResponse,
} from "@amni/shared";

import { AuthGuard } from "../auth/auth.guard";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { WarehousesService } from "./warehouses.service";

@Controller("inventory/warehouses")
@UseGuards(AuthGuard)
export class WarehousesController {
  constructor(private readonly warehouses: WarehousesService) {}

  @Get()
  list(@Query() query: unknown): WarehouseListResponse {
    return this.warehouses.list(warehouseListQuerySchema.parse(query));
  }

  @Get(":code")
  detail(@Param("code") code: string): WarehouseDetail {
    return this.warehouses.detail(code);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: unknown): Warehouse {
    return this.warehouses.create(createWarehouseInputSchema.parse(body));
  }

  @Patch(":code")
  update(@Param("code") code: string, @Body() body: unknown): Warehouse {
    return this.warehouses.update(code, updateWarehouseInputSchema.parse(body));
  }

  @Delete(":code")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("code") code: string): void {
    this.warehouses.remove(code);
  }
}
