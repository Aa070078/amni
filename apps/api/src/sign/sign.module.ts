import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { SignController } from "./sign.controller";
import { SignService } from "./sign.service";

@Module({
  imports: [AuthModule],
  controllers: [SignController],
  providers: [SignService],
  exports: [SignService],
})
export class SignModule {}
