import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { StockMovementsController } from "./stock-movements.controller";
import { StockMovementsService } from "./stock-movements.service";

@Module({
  imports: [AuthModule],
  controllers: [StockMovementsController],
  providers: [StockMovementsService],
})
export class StockMovementsModule {}
