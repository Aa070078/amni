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
  createProductInputSchema,
  productListQuerySchema,
  updateProductInputSchema,
  type Product,
  type ProductListResponse,
} from "@amni/shared";

import { AuthGuard } from "../auth/auth.guard";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ProductsService } from "./products.service";

@Controller("inventory/products")
@UseGuards(AuthGuard)
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list(@Query() query: unknown): ProductListResponse {
    return this.products.list(productListQuerySchema.parse(query));
  }

  @Get(":code")
  detail(@Param("code") code: string): Product {
    return this.products.detail(code);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: unknown): Product {
    return this.products.create(createProductInputSchema.parse(body));
  }

  @Patch(":code")
  update(@Param("code") code: string, @Body() body: unknown): Product {
    return this.products.update(code, updateProductInputSchema.parse(body));
  }

  @Delete(":code")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("code") code: string): void {
    this.products.remove(code);
  }
}
