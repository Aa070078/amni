import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { ErpGatewayModule } from "../erp-gateway/erp-gateway.module";
import { LeadsController } from "./leads.controller";
import { LeadsService } from "./leads.service";

@Module({
  imports: [AuthModule, ErpGatewayModule],
  controllers: [LeadsController],
  providers: [LeadsService],
})
export class LeadsModule {}
