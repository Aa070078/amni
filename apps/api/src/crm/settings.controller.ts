import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { crmDialInputSchema, updateCrmSettingsInputSchema, type CrmDialResult, type CrmSettings } from "@amni/shared";

import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { metaFrom, userFrom } from "../common/request-context";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmSettingsService } from "./settings.service";

@Controller("sales/crm/settings")
@UseGuards(AuthGuard)
export class CrmSettingsController {
  constructor(private readonly settings: CrmSettingsService) {}

  @Get()
  get(@Req() req: AuthenticatedRequest): Promise<CrmSettings> {
    return this.settings.get(userFrom(req), metaFrom(req));
  }

  @Patch()
  update(@Req() req: AuthenticatedRequest, @Body() body: unknown): Promise<CrmSettings> {
    return this.settings.update(userFrom(req), metaFrom(req), updateCrmSettingsInputSchema.parse(body));
  }

  @Post("dial")
  @HttpCode(HttpStatus.OK)
  dial(@Req() req: AuthenticatedRequest, @Body() body: unknown): Promise<CrmDialResult> {
    return this.settings.dial(userFrom(req), metaFrom(req), crmDialInputSchema.parse(body));
  }
}
