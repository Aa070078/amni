import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { ErpGatewayModule } from "../erp-gateway/erp-gateway.module";
import { DealsController } from "./deals.controller";
import { DealsService } from "./deals.service";

@Module({
  imports: [AuthModule, ErpGatewayModule],
  controllers: [DealsController],
  providers: [DealsService],
  exports: [DealsService],
})
export class DealsModule {}
