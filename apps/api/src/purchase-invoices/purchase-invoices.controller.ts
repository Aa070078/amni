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
import { z } from "zod";
import {
  createPurchaseInvoiceInputSchema,
  purchaseInvoiceListQuerySchema,
  purchaseInvoiceStatusSchema,
  recordPaymentInputSchema,
  updatePurchaseInvoiceInputSchema,
  type PurchaseInvoice,
  type PurchaseInvoiceListResponse,
} from "@amni/shared";

import { AuthGuard } from "../auth/auth.guard";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { PurchaseInvoicesService } from "./purchase-invoices.service";
import type { PurchaseInvoiceOptions } from "./purchase-invoices.service";

const changePurchaseInvoiceStatusInputSchema = z.object({ status: purchaseInvoiceStatusSchema });

@Controller("purchasing/invoices")
@UseGuards(AuthGuard)
export class PurchaseInvoicesController {
  constructor(private readonly purchaseInvoices: PurchaseInvoicesService) {}

  @Get("options")
  options(): PurchaseInvoiceOptions {
    return this.purchaseInvoices.options();
  }

  @Get()
  list(@Query() query: unknown): PurchaseInvoiceListResponse {
    return this.purchaseInvoices.list(purchaseInvoiceListQuerySchema.parse(query));
  }

  @Get(":code")
  detail(@Param("code") code: string): PurchaseInvoice {
    return this.purchaseInvoices.detail(code);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: unknown): PurchaseInvoice {
    return this.purchaseInvoices.create(createPurchaseInvoiceInputSchema.parse(body));
  }

  @Patch(":code/status")
  changeStatus(@Param("code") code: string, @Body() body: unknown): PurchaseInvoice {
    return this.purchaseInvoices.changeStatus(code, changePurchaseInvoiceStatusInputSchema.parse(body));
  }

  @Patch(":code/pay")
  recordPayment(@Param("code") code: string, @Body() body: unknown): PurchaseInvoice {
    return this.purchaseInvoices.recordPayment(code, recordPaymentInputSchema.parse(body));
  }

  @Patch(":code")
  update(@Param("code") code: string, @Body() body: unknown): PurchaseInvoice {
    return this.purchaseInvoices.update(code, updatePurchaseInvoiceInputSchema.parse(body));
  }

  @Delete(":code")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("code") code: string): void {
    this.purchaseInvoices.remove(code);
  }
}
