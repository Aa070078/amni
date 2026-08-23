import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { DomainRecordModule } from "../common/domain-record.module";
import { EquityController } from "./equity.controller";
import { EquityService } from "./equity.service";

@Module({
  imports: [AuthModule, DomainRecordModule],
  controllers: [EquityController],
  providers: [EquityService],
  exports: [EquityService],
})
export class EquityModule {}
