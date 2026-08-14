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
  createCustomerInputSchema,
  customerListQuerySchema,
  updateCustomerInputSchema,
  type Customer,
  type CustomerListResponse,
} from "@amni/shared";

import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { metaFrom, userFrom } from "../common/request-context";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CustomersService } from "./customers.service";

@Controller("sales/customers")
@UseGuards(AuthGuard)
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest, @Query() query: unknown): Promise<CustomerListResponse> {
    return this.customers.list(userFrom(req), metaFrom(req), customerListQuerySchema.parse(query));
  }

  @Get(":code")
  detail(@Req() req: AuthenticatedRequest, @Param("code") code: string): Promise<Customer> {
    return this.customers.detail(userFrom(req), metaFrom(req), code);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: AuthenticatedRequest, @Body() body: unknown): Promise<Customer> {
    return this.customers.create(userFrom(req), metaFrom(req), createCustomerInputSchema.parse(body));
  }

  @Patch(":code")
  update(
    @Req() req: AuthenticatedRequest,
    @Param("code") code: string,
    @Body() body: unknown,
  ): Promise<Customer> {
    return this.customers.update(userFrom(req), metaFrom(req), code, updateCustomerInputSchema.parse(body));
  }

  @Delete(":code")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() req: AuthenticatedRequest, @Param("code") code: string): Promise<void> {
    return this.customers.remove(userFrom(req), metaFrom(req), code);
  }
}
