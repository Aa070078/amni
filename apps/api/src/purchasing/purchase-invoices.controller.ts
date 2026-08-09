import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import {
  purchaseInvoiceListQuerySchema,
  type PurchaseInvoiceDetail,
  type PurchaseInvoiceListResponse,
} from "@amni/shared";

import { AuthGuard } from "../auth/auth.guard";
import { parseQuery } from "../common/parse-query";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { PurchaseInvoicesService } from "./purchase-invoices.service";

@Controller("purchase-invoices")
@UseGuards(AuthGuard)
export class PurchaseInvoicesController {
  constructor(private readonly purchaseInvoices: PurchaseInvoicesService) {}

  @Get()
  list(@Query() query: unknown): PurchaseInvoiceListResponse {
    return this.purchaseInvoices.list(parseQuery(purchaseInvoiceListQuerySchema, query));
  }

  @Get(":id")
  detail(@Param("id") id: string): PurchaseInvoiceDetail {
    return this.purchaseInvoices.getById(id);
  }
}
