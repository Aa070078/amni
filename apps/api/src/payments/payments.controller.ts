import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  createPaymentInputSchema,
  paymentListQuerySchema,
  type Payment,
  type PaymentListResponse,
} from "@amni/shared";

import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser, ReqMeta } from "../auth/request.decorators";
import type { RequestMeta } from "../auth/auth.service";
import type { GatewayUser } from "../erp-gateway/erp-gateway.service";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { PaymentsService } from "./payments.service";

@Controller("finance/payments")
@UseGuards(AuthGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  list(
    @CurrentUser() user: GatewayUser,
    @ReqMeta() meta: RequestMeta,
    @Query() query: unknown,
  ): Promise<PaymentListResponse> {
    return this.payments.list(user, meta, paymentListQuerySchema.parse(query));
  }

  @Get(":code")
  detail(@CurrentUser() user: GatewayUser, @ReqMeta() meta: RequestMeta, @Param("code") code: string): Promise<Payment> {
    return this.payments.detail(user, meta, code);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: GatewayUser, @ReqMeta() meta: RequestMeta, @Body() body: unknown): Promise<Payment> {
    return this.payments.create(user, meta, createPaymentInputSchema.parse(body));
  }
}
