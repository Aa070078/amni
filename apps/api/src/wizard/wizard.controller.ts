import { Body, Controller, Get, Post, Put, UseGuards } from "@nestjs/common";
import {
  wizardSaveInputSchema,
  wizardSubmitInputSchema,
  type WizardDraft,
  type WizardStatus,
} from "@amni/shared";

import { AuthGuard } from "../auth/auth.guard";
import { AllowMemberMutation } from "../auth/authorization.decorator";
import { CurrentUser } from "../auth/request.decorators";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { WizardService } from "./wizard.service";

@Controller("wizard")
@UseGuards(AuthGuard)
@AllowMemberMutation()
export class WizardController {
  constructor(private readonly wizard: WizardService) {}

  @Get()
  draft(@CurrentUser() user: { id: string }): Promise<WizardDraft> {
    return this.wizard.draft(user.id);
  }

  @Put()
  save(@Body() body: unknown, @CurrentUser() user: { id: string }): Promise<WizardDraft> {
    return this.wizard.save(user.id, wizardSaveInputSchema.parse(body));
  }

  @Post("submit")
  submit(@Body() body: unknown, @CurrentUser() user: { id: string; email: string }): Promise<WizardStatus> {
    return this.wizard.submit(user, wizardSubmitInputSchema.parse(body ?? {}));
  }

  @Get("status")
  status(@CurrentUser() user: { id: string }): Promise<WizardStatus> {
    return this.wizard.status(user.id);
  }
}
