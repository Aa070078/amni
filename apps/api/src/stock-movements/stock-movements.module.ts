import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { ErpGatewayModule } from "../erp-gateway/erp-gateway.module";
import { StockMovementsController } from "./stock-movements.controller";
import { StockMovementsService } from "./stock-movements.service";

@Module({
  imports: [AuthModule, ErpGatewayModule],
  controllers: [StockMovementsController],
  providers: [StockMovementsService],
})
export class StockMovementsModule {}
