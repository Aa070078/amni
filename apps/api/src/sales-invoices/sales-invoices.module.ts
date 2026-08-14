import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { ErpGatewayModule } from "../erp-gateway/erp-gateway.module";
import { SalesInvoicesController } from "./sales-invoices.controller";
import { SalesInvoicesService } from "./sales-invoices.service";

@Module({
  imports: [AuthModule, ErpGatewayModule],
  controllers: [SalesInvoicesController],
  providers: [SalesInvoicesService],
})
export class SalesInvoicesModule {}
