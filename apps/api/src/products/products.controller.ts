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
  createProductInputSchema,
  productListQuerySchema,
  updateProductInputSchema,
  type Product,
  type ProductListResponse,
} from "@amni/shared";

import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { metaFrom, userFrom } from "../common/request-context";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ProductsService } from "./products.service";

@Controller("inventory/products")
@UseGuards(AuthGuard)
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest, @Query() query: unknown): Promise<ProductListResponse> {
    return this.products.list(userFrom(req), metaFrom(req), productListQuerySchema.parse(query));
  }

  @Get(":code")
  detail(@Req() req: AuthenticatedRequest, @Param("code") code: string): Promise<Product> {
    return this.products.detail(userFrom(req), metaFrom(req), code);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: AuthenticatedRequest, @Body() body: unknown): Promise<Product> {
    return this.products.create(userFrom(req), metaFrom(req), createProductInputSchema.parse(body));
  }

  @Patch(":code")
  update(
    @Req() req: AuthenticatedRequest,
    @Param("code") code: string,
    @Body() body: unknown,
  ): Promise<Product> {
    return this.products.update(userFrom(req), metaFrom(req), code, updateProductInputSchema.parse(body));
  }

  @Delete(":code")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() req: AuthenticatedRequest, @Param("code") code: string): Promise<void> {
    return this.products.remove(userFrom(req), metaFrom(req), code);
  }
}
