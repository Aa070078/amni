import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from "@nestjs/common";
import {
  createCrmCommentInputSchema,
  createCrmStatusActivityInputSchema,
  crmActivityListQuerySchema,
  type CrmActivity,
  type CrmActivityListResponse,
} from "@amni/shared";

import { AuthGuard } from "../auth/auth.guard";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmActivitiesService } from "./activities.service";

@Controller("sales/crm/activities")
@UseGuards(AuthGuard)
export class CrmActivitiesController {
  constructor(private readonly activities: CrmActivitiesService) {}

  @Get()
  list(@Query() query: unknown): CrmActivityListResponse {
    return this.activities.list(crmActivityListQuerySchema.parse(query));
  }

  @Post("comments")
  @HttpCode(HttpStatus.CREATED)
  createComment(@Body() body: unknown): CrmActivity {
    return this.activities.createComment(createCrmCommentInputSchema.parse(body));
  }

  @Post("status")
  @HttpCode(HttpStatus.CREATED)
  createStatusActivity(@Body() body: unknown): CrmActivity {
    return this.activities.createStatusActivity(createCrmStatusActivityInputSchema.parse(body));
  }
}
