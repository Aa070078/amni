import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { ErpGatewayModule } from "../erp-gateway/erp-gateway.module";
import { InvoicingController } from "./invoicing.controller";
import { InvoicingService } from "./invoicing.service";

@Module({
  imports: [AuthModule, ErpGatewayModule],
  controllers: [InvoicingController],
  providers: [InvoicingService],
  exports: [InvoicingService],
})
export class InvoicingModule {}
