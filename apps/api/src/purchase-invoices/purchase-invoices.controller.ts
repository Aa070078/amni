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
import { CurrentUser, ReqMeta } from "../auth/request.decorators";
import type { RequestMeta } from "../auth/auth.service";
import type { GatewayUser } from "../erp-gateway/erp-gateway.service";
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
  options(@CurrentUser() user: GatewayUser, @ReqMeta() meta: RequestMeta): Promise<PurchaseInvoiceOptions> {
    return this.purchaseInvoices.options(user, meta);
  }

  @Get()
  list(
    @CurrentUser() user: GatewayUser,
    @ReqMeta() meta: RequestMeta,
    @Query() query: unknown,
  ): Promise<PurchaseInvoiceListResponse> {
    return this.purchaseInvoices.list(user, meta, purchaseInvoiceListQuerySchema.parse(query));
  }

  @Get(":code")
  detail(
    @CurrentUser() user: GatewayUser,
    @ReqMeta() meta: RequestMeta,
    @Param("code") code: string,
  ): Promise<PurchaseInvoice> {
    return this.purchaseInvoices.detail(user, meta, code);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: GatewayUser,
    @ReqMeta() meta: RequestMeta,
    @Body() body: unknown,
  ): Promise<PurchaseInvoice> {
    return this.purchaseInvoices.create(user, meta, createPurchaseInvoiceInputSchema.parse(body));
  }

  @Patch(":code/status")
  changeStatus(
    @CurrentUser() user: GatewayUser,
    @ReqMeta() meta: RequestMeta,
    @Param("code") code: string,
    @Body() body: unknown,
  ): Promise<PurchaseInvoice> {
    return this.purchaseInvoices.changeStatus(user, meta, code, changePurchaseInvoiceStatusInputSchema.parse(body));
  }

  @Patch(":code/pay")
  recordPayment(
    @CurrentUser() user: GatewayUser,
    @ReqMeta() meta: RequestMeta,
    @Param("code") code: string,
    @Body() body: unknown,
  ): Promise<PurchaseInvoice> {
    return this.purchaseInvoices.recordPayment(user, meta, code, recordPaymentInputSchema.parse(body));
  }

  @Patch(":code")
  update(
    @CurrentUser() user: GatewayUser,
    @ReqMeta() meta: RequestMeta,
    @Param("code") code: string,
    @Body() body: unknown,
  ): Promise<PurchaseInvoice> {
    return this.purchaseInvoices.update(user, meta, code, updatePurchaseInvoiceInputSchema.parse(body));
  }

  @Delete(":code")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: GatewayUser, @ReqMeta() meta: RequestMeta, @Param("code") code: string): Promise<void> {
    return this.purchaseInvoices.remove(user, meta, code);
  }
}
