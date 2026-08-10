import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { EsgController } from "./esg.controller";
import { EsgService } from "./esg.service";

@Module({
  imports: [AuthModule],
  controllers: [EsgController],
  providers: [EsgService],
  exports: [EsgService],
})
export class EsgModule {}
