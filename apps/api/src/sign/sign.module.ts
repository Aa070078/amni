import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { DomainRecordModule } from "../common/domain-record.module";
import { SignController } from "./sign.controller";
import { SignService } from "./sign.service";

@Module({
  imports: [AuthModule, DomainRecordModule],
  controllers: [SignController],
  providers: [SignService],
  exports: [SignService],
})
export class SignModule {}
