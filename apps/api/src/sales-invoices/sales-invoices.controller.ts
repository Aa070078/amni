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
import { z } from "zod";
import {
  createSalesInvoiceInputSchema,
  recordPaymentInputSchema,
  salesInvoiceListQuerySchema,
  salesInvoiceStatusSchema,
  updateSalesInvoiceInputSchema,
  type SalesInvoice,
  type SalesInvoiceListResponse,
} from "@amni/shared";

import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { metaFrom, userFrom } from "../common/request-context";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { SalesInvoicesService } from "./sales-invoices.service";
import type { SalesInvoiceOptions, SalesInvoiceSummary } from "./sales-invoices.service";

const changeInvoiceStatusInputSchema = z.object({ status: salesInvoiceStatusSchema });

@Controller("sales/invoices")
@UseGuards(AuthGuard)
export class SalesInvoicesController {
  constructor(private readonly salesInvoices: SalesInvoicesService) {}

  @Get("summary")
  summary(@Req() req: AuthenticatedRequest): Promise<SalesInvoiceSummary> {
    return this.salesInvoices.summary(userFrom(req), metaFrom(req));
  }

  @Get("options")
  options(@Req() req: AuthenticatedRequest): Promise<SalesInvoiceOptions> {
    return this.salesInvoices.options(userFrom(req), metaFrom(req));
  }

  @Get()
  list(@Req() req: AuthenticatedRequest, @Query() query: unknown): Promise<SalesInvoiceListResponse> {
    return this.salesInvoices.list(userFrom(req), metaFrom(req), salesInvoiceListQuerySchema.parse(query));
  }

  @Get(":code")
  detail(@Req() req: AuthenticatedRequest, @Param("code") code: string): Promise<SalesInvoice> {
    return this.salesInvoices.detail(userFrom(req), metaFrom(req), code);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: AuthenticatedRequest, @Body() body: unknown): Promise<SalesInvoice> {
    return this.salesInvoices.create(userFrom(req), metaFrom(req), createSalesInvoiceInputSchema.parse(body));
  }

  @Patch(":code/status")
  changeStatus(
    @Req() req: AuthenticatedRequest,
    @Param("code") code: string,
    @Body() body: unknown,
  ): Promise<SalesInvoice> {
    return this.salesInvoices.changeStatus(userFrom(req), metaFrom(req), code, changeInvoiceStatusInputSchema.parse(body).status);
  }

  @Patch(":code")
  update(
    @Req() req: AuthenticatedRequest,
    @Param("code") code: string,
    @Body() body: unknown,
  ): Promise<SalesInvoice> {
    return this.salesInvoices.update(userFrom(req), metaFrom(req), code, updateSalesInvoiceInputSchema.parse(body));
  }

  @Post(":code/payments")
  recordPayment(
    @Req() req: AuthenticatedRequest,
    @Param("code") code: string,
    @Body() body: unknown,
  ): Promise<SalesInvoice> {
    return this.salesInvoices.recordPayment(userFrom(req), metaFrom(req), code, recordPaymentInputSchema.parse(body));
  }

  @Delete(":code")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() req: AuthenticatedRequest, @Param("code") code: string): Promise<void> {
    return this.salesInvoices.remove(userFrom(req), metaFrom(req), code);
  }
}
