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
  createCustomerInputSchema,
  customerListQuerySchema,
  updateCustomerInputSchema,
  type Customer,
  type CustomerListResponse,
} from "@amni/shared";

import { AuthGuard } from "../auth/auth.guard";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CustomersService } from "./customers.service";

@Controller("sales/customers")
@UseGuards(AuthGuard)
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  list(@Query() query: unknown): CustomerListResponse {
    return this.customers.list(customerListQuerySchema.parse(query));
  }

  @Get(":code")
  detail(@Param("code") code: string): Customer {
    return this.customers.detail(code);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: unknown): Customer {
    return this.customers.create(createCustomerInputSchema.parse(body));
  }

  @Patch(":code")
  update(@Param("code") code: string, @Body() body: unknown): Customer {
    return this.customers.update(code, updateCustomerInputSchema.parse(body));
  }

  @Delete(":code")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("code") code: string): void {
    this.customers.remove(code);
  }
}
