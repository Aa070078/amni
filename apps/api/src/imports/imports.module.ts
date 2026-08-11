import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";

import { BullQueue } from "@amni/shared";

import { AuthModule } from "../auth/auth.module";
import { ImportsController } from "./imports.controller";
import { ImportsService } from "./imports.service";

@Module({
  imports: [AuthModule, BullModule.registerQueue({ name: BullQueue.IMPORTS })],
  controllers: [ImportsController],
  providers: [ImportsService],
})
export class ImportsModule {}
