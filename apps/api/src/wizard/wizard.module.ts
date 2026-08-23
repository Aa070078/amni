import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { PlansModule } from "../plans/plans.module";
import { ProvisioningModule } from "../provisioning/provisioning.module";
import { WizardController } from "./wizard.controller";
import { WizardService } from "./wizard.service";

@Module({
  imports: [AuthModule, PlansModule, ProvisioningModule],
  controllers: [WizardController],
  providers: [WizardService],
})
export class WizardModule {}
