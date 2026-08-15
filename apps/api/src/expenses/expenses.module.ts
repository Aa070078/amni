import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { ErpGatewayModule } from "../erp-gateway/erp-gateway.module";
import { ExpensesController } from "./expenses.controller";
import { ExpensesService } from "./expenses.service";

@Module({
  imports: [AuthModule, ErpGatewayModule],
  controllers: [ExpensesController],
  providers: [ExpensesService],
})
export class ExpensesModule {}
