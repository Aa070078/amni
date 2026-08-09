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
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { SuppliersService } from "./suppliers.service";

@Controller("purchasing/suppliers")
@UseGuards(AuthGuard)
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Get()
  list(@Query() query: unknown): SupplierListResponse {
    return this.suppliers.list(supplierListQuerySchema.parse(query));
  }

  @Get(":code")
  detail(@Param("code") code: string): Supplier {
    return this.suppliers.detail(code);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: unknown): Supplier {
    return this.suppliers.create(createSupplierInputSchema.parse(body));
  }

  @Patch(":code")
  update(@Param("code") code: string, @Body() body: unknown): Supplier {
    return this.suppliers.update(code, updateSupplierInputSchema.parse(body));
  }

  @Delete(":code")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("code") code: string): void {
    this.suppliers.remove(code);
  }
}
