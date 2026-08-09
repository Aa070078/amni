import { Module } from "@nestjs/common";

import { SalesInvoicesController } from "./sales-invoices.controller";
import { SalesInvoicesService } from "./sales-invoices.service";

@Module({
  controllers: [SalesInvoicesController],
  providers: [SalesInvoicesService],
})
export class SalesInvoicesModule {}
