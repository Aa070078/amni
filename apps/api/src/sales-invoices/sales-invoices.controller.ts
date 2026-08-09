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
  createSalesInvoiceInputSchema,
  recordPaymentInputSchema,
  salesInvoiceListQuerySchema,
  salesInvoiceStatusSchema,
  updateSalesInvoiceInputSchema,
  type SalesInvoice,
  type SalesInvoiceListResponse,
} from "@amni/shared";

import { AuthGuard } from "../auth/auth.guard";
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
  summary(): SalesInvoiceSummary {
    return this.salesInvoices.summary();
  }

  @Get("options")
  options(): SalesInvoiceOptions {
    return this.salesInvoices.options();
  }

  @Get()
  list(@Query() query: unknown): SalesInvoiceListResponse {
    return this.salesInvoices.list(salesInvoiceListQuerySchema.parse(query));
  }

  @Get(":code")
  detail(@Param("code") code: string): SalesInvoice {
    return this.salesInvoices.detail(code);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: unknown): SalesInvoice {
    return this.salesInvoices.create(createSalesInvoiceInputSchema.parse(body));
  }

  @Patch(":code/status")
  changeStatus(@Param("code") code: string, @Body() body: unknown): SalesInvoice {
    return this.salesInvoices.changeStatus(code, changeInvoiceStatusInputSchema.parse(body));
  }

  @Patch(":code")
  update(@Param("code") code: string, @Body() body: unknown): SalesInvoice {
    return this.salesInvoices.update(code, updateSalesInvoiceInputSchema.parse(body));
  }

  @Post(":code/payments")
  recordPayment(@Param("code") code: string, @Body() body: unknown): SalesInvoice {
    return this.salesInvoices.recordPayment(code, recordPaymentInputSchema.parse(body));
  }

  @Delete(":code")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("code") code: string): void {
    this.salesInvoices.remove(code);
  }
}
