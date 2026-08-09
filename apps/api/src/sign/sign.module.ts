import { Module } from "@nestjs/common";

import { SignController } from "./sign.controller";
import { SignService } from "./sign.service";

@Module({
  controllers: [SignController],
  providers: [SignService],
  exports: [SignService],
})
export class SignModule {}
