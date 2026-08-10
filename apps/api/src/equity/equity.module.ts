import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { EquityController } from "./equity.controller";
import { EquityService } from "./equity.service";

@Module({
  imports: [AuthModule],
  controllers: [EquityController],
  providers: [EquityService],
  exports: [EquityService],
})
export class EquityModule {}
