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
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { PaymentsService } from "./payments.service";

@Controller("finance/payments")
@UseGuards(AuthGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  list(@Query() query: unknown): PaymentListResponse {
    return this.payments.list(paymentListQuerySchema.parse(query));
  }

  @Get(":code")
  detail(@Param("code") code: string): Payment {
    return this.payments.detail(code);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: unknown): Payment {
    return this.payments.create(createPaymentInputSchema.parse(body));
  }
}
