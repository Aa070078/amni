import { Controller, Get, UseGuards } from "@nestjs/common";
import type { PlansListResponse } from "@amni/shared";

import { AuthGuard } from "../auth/auth.guard";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { PlansService } from "./plans.service";

@Controller("plans")
@UseGuards(AuthGuard)
export class PlansController {
  constructor(private readonly plans: PlansService) {}

  @Get()
  list(): Promise<PlansListResponse> {
    return this.plans.list();
  }
}
