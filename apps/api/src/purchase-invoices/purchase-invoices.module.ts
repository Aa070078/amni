import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { ErpGatewayModule } from "../erp-gateway/erp-gateway.module";
import { PurchaseInvoicesController } from "./purchase-invoices.controller";
import { PurchaseInvoicesService } from "./purchase-invoices.service";

@Module({
  imports: [AuthModule, ErpGatewayModule],
  controllers: [PurchaseInvoicesController],
  providers: [PurchaseInvoicesService],
})
export class PurchaseInvoicesModule {}
