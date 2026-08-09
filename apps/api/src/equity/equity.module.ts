import { Module } from "@nestjs/common";

import { EquityController } from "./equity.controller";
import { EquityService } from "./equity.service";

@Module({
  controllers: [EquityController],
  providers: [EquityService],
  exports: [EquityService],
})
export class EquityModule {}
