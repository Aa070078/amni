import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { ErpGatewayModule } from "../erp-gateway/erp-gateway.module";
import { FinanceController } from "./finance.controller";
import { FinanceService } from "./finance.service";

@Module({
  imports: [AuthModule, ErpGatewayModule],
  controllers: [FinanceController],
  providers: [FinanceService],
})
export class FinanceModule {}
