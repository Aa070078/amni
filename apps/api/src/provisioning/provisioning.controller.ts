import { Controller, Get, Post, UseGuards } from "@nestjs/common";
import type { ProvisioningStatus } from "@amni/shared";

import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/request.decorators";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ProvisioningService } from "./provisioning.service";

@Controller("provisioning")
@UseGuards(AuthGuard)
export class ProvisioningController {
  constructor(private readonly provisioning: ProvisioningService) {}

  @Get("status")
  status(@CurrentUser() user: { id: string; email: string }): Promise<ProvisioningStatus> {
    return this.provisioning.statusFor(user.id);
  }

  @Post("retry")
  retry(@CurrentUser() user: { id: string }): Promise<{ jobId: string }> {
    return this.provisioning.retryFor(user.id);
  }
}
