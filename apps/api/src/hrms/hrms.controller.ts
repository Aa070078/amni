import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { hrmsSsoUrlQuerySchema, type HrmsSsoUrlResponse, type HrmsStatus } from "@amni/shared";

import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/request.decorators";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { HrmsService } from "./hrms.service";

@Controller("hrms")
@UseGuards(AuthGuard)
export class HrmsController {
  constructor(private readonly hrms: HrmsService) {}

  @Get("status")
  status(@CurrentUser() user: { id: string }): Promise<HrmsStatus> {
    return this.hrms.status(user.id);
  }

  @Get("sso-url")
  ssoUrl(
    @CurrentUser() user: { id: string; email: string },
    @Query() query: unknown,
  ): Promise<HrmsSsoUrlResponse> {
    return this.hrms.ssoUrl(user.id, user.email, hrmsSsoUrlQuerySchema.parse(query));
  }
}
