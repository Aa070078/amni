import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { ErpGatewayModule } from "../erp-gateway/erp-gateway.module";
import { WarehousesController } from "./warehouses.controller";
import { WarehousesService } from "./warehouses.service";

@Module({
  imports: [AuthModule, ErpGatewayModule],
  controllers: [WarehousesController],
  providers: [WarehousesService],
  exports: [WarehousesService],
})
export class WarehousesModule {}
