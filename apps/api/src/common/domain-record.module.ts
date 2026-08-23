import { Module } from "@nestjs/common";

import { ErpGatewayModule } from "../erp-gateway/erp-gateway.module";
import { DomainRecordRepository } from "./domain-record.repository";

@Module({
  imports: [ErpGatewayModule],
  providers: [DomainRecordRepository],
  exports: [DomainRecordRepository],
})
export class DomainRecordModule {}
