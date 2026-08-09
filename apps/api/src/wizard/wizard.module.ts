import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { SettingsModule } from "../settings/settings.module";
import { WizardController } from "./wizard.controller";
import { WizardService } from "./wizard.service";

@Module({
  imports: [AuthModule, SettingsModule],
  controllers: [WizardController],
  providers: [WizardService],
})
export class WizardModule {}
