import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { HrmsController } from "./hrms.controller";
import { HrmsService } from "./hrms.service";

@Module({
  imports: [AuthModule],
  controllers: [HrmsController],
  providers: [HrmsService],
})
export class HrmsModule {}
