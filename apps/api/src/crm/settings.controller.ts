import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, UseGuards } from "@nestjs/common";
import { crmDialInputSchema, updateCrmSettingsInputSchema, type CrmDialResult, type CrmSettings } from "@amni/shared";

import { AuthGuard } from "../auth/auth.guard";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmSettingsService } from "./settings.service";

@Controller("sales/crm/settings")
@UseGuards(AuthGuard)
export class CrmSettingsController {
  constructor(private readonly settings: CrmSettingsService) {}

  @Get()
  get(): CrmSettings {
    return this.settings.get();
  }

  @Patch()
  update(@Body() body: unknown): CrmSettings {
    return this.settings.update(updateCrmSettingsInputSchema.parse(body));
  }

  @Post("dial")
  @HttpCode(HttpStatus.OK)
  dial(@Body() body: unknown): CrmDialResult {
    return this.settings.dial(crmDialInputSchema.parse(body));
  }
}
