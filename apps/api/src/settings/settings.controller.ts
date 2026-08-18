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
import { CurrentUser } from "../auth/request.decorators";
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
  updateCompany(@Body() body: unknown, @CurrentUser() user: { id: string }): Promise<CompanySettings> {
    return this.settings.updateCompany(user.id, updateCompanySettingsInputSchema.parse(body));
  }

  @Get("team")
  team(): TeamMember[] {
    return this.settings.team();
  }

  @Post("team/invites")
  invite(@Body() body: unknown): TeamMember {
    return this.settings.invite(inviteMemberInputSchema.parse(body));
  }

  @Patch("team/:id")
  updateMember(@Param("id") id: string, @Body() body: unknown): TeamMember {
    return this.settings.updateMember(id, updateMemberInputSchema.parse(body));
  }

  @Get("roles")
  roles(): SettingsRole[] {
    return this.settings.roles();
  }

  @Get("plan")
  plan(): CurrentPlan {
    return this.settings.plan();
  }

  @Patch("plan/billing")
  changeBilling(@Body() body: unknown): CurrentPlan {
    return this.settings.changeBilling(billingInputSchema.parse(body));
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
