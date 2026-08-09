import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { PurchaseInvoicesController } from "./purchase-invoices.controller";
import { PurchaseInvoicesService } from "./purchase-invoices.service";
import { PurchaseOrdersController } from "./purchase-orders.controller";
import { PurchaseOrdersService } from "./purchase-orders.service";
import { SuppliersController } from "./suppliers.controller";
import { SuppliersService } from "./suppliers.service";

@Module({
  imports: [AuthModule],
  controllers: [SuppliersController, PurchaseOrdersController, PurchaseInvoicesController],
  providers: [SuppliersService, PurchaseOrdersService, PurchaseInvoicesService],
})
export class PurchasingModule {}
