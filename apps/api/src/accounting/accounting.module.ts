import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { ErpGatewayModule } from "../erp-gateway/erp-gateway.module";
import { AccountingController } from "./accounting.controller";
import { AccountingService } from "./accounting.service";

@Module({
  imports: [AuthModule, ErpGatewayModule],
  controllers: [AccountingController],
  providers: [AccountingService],
  exports: [AccountingService],
})
export class AccountingModule {}
