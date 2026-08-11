import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";

import { BullQueue } from "@amni/shared";

import { AuthModule } from "../auth/auth.module";
import { ProvisioningController } from "./provisioning.controller";
import { ProvisioningService } from "./provisioning.service";

@Module({
  imports: [AuthModule, BullModule.registerQueue({ name: BullQueue.PROVISIONING })],
  controllers: [ProvisioningController],
  providers: [ProvisioningService],
  exports: [ProvisioningService],
})
export class ProvisioningModule {}
