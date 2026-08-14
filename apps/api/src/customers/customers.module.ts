import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { ErpGatewayModule } from "../erp-gateway/erp-gateway.module";
import { CustomersController } from "./customers.controller";
import { CustomersService } from "./customers.service";

@Module({
  imports: [AuthModule, ErpGatewayModule],
  controllers: [CustomersController],
  providers: [CustomersService],
})
export class CustomersModule {}
