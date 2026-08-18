import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import {
  billingInputSchema,
  updateCompanySettingsInputSchema,
  updateMemberInputSchema,
  updateProfileInputSchema,
  inviteMemberInputSchema,
  type CompanySettings,
  type CurrentPlan,
  type Integration,
  type ProfileSettings,
  type SettingsRole,
  type TeamMember,
} from "@amni/shared";

import { AuthGuard } from "../auth/auth.guard";
import { AllowMemberMutation } from "../auth/authorization.decorator";
import type { RequestMeta } from "../auth/auth.service";
import { CurrentUser, ReqMeta } from "../auth/request.decorators";
import type { GatewayUser } from "../erp-gateway/erp-gateway.service";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { SettingsService } from "./settings.service";

@Controller("settings")
@UseGuards(AuthGuard)
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get("company")
  company(@CurrentUser() user: { id: string }): Promise<CompanySettings> {
    return this.settings.company(user.id);
  }

  @Patch("company")
  updateCompany(@Body() body: unknown, @CurrentUser() user: GatewayUser, @ReqMeta() meta: RequestMeta): Promise<CompanySettings> {
    return this.settings.updateCompany(user, meta, updateCompanySettingsInputSchema.parse(body));
  }

  @Get("team")
  team(@CurrentUser() user: GatewayUser): Promise<TeamMember[]> {
    return this.settings.team(user.id);
  }

  @Post("team/invites")
  invite(@Body() body: unknown, @CurrentUser() user: GatewayUser, @ReqMeta() meta: RequestMeta): Promise<TeamMember> {
    return this.settings.invite(user, meta, inviteMemberInputSchema.parse(body));
  }

  @Patch("team/:id")
  updateMember(@Param("id") id: string, @Body() body: unknown, @CurrentUser() user: GatewayUser, @ReqMeta() meta: RequestMeta): Promise<TeamMember> {
    return this.settings.updateMember(user, meta, id, updateMemberInputSchema.parse(body));
  }

  @Get("roles")
  roles(@CurrentUser() user: GatewayUser): Promise<SettingsRole[]> {
    return this.settings.roles(user.id);
  }

  @Get("plan")
  plan(@CurrentUser() user: GatewayUser): Promise<CurrentPlan> {
    return this.settings.plan(user.id);
  }

  @Patch("plan/billing")
  changeBilling(@Body() body: unknown, @CurrentUser() user: GatewayUser, @ReqMeta() meta: RequestMeta): Promise<CurrentPlan> {
    return this.settings.changeBilling(user, meta, billingInputSchema.parse(body));
  }

  @Get("integrations")
  integrations(): Integration[] {
    return this.settings.integrations();
  }

  @Patch("integrations/:key")
  toggleIntegration(@Param("key") key: string): Integration {
    return this.settings.toggleIntegration(key);
  }

  @Get("profile")
  profile(@CurrentUser() user: { id: string; email: string }): Promise<ProfileSettings> {
    return this.settings.profile(user);
  }

  @Patch("profile")
  @AllowMemberMutation()
  updateProfile(@Body() body: unknown, @CurrentUser() user: { id: string; email: string }): Promise<ProfileSettings> {
    return this.settings.updateProfile(user, updateProfileInputSchema.parse(body));
  }
}
