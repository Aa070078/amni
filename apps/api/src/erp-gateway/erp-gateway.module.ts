import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { ErpGatewayController } from "./erp-gateway.controller";
import { ErpGatewayService } from "./erp-gateway.service";

@Module({
  imports: [AuthModule],
  controllers: [ErpGatewayController],
  providers: [ErpGatewayService],
  exports: [ErpGatewayService],
})
export class ErpGatewayModule {}
