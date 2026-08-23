import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Req, UseGuards } from "@nestjs/common";
import {
  createCrmCommentInputSchema,
  createCrmStatusActivityInputSchema,
  crmActivityListQuerySchema,
  type CrmActivity,
  type CrmActivityListResponse,
} from "@amni/shared";

import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { metaFrom, userFrom } from "../common/request-context";
// Value import required so TypeScript emits Nest constructor metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmActivitiesService } from "./activities.service";

@Controller("sales/crm/activities")
@UseGuards(AuthGuard)
export class CrmActivitiesController {
  constructor(private readonly activities: CrmActivitiesService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest, @Query() query: unknown): Promise<CrmActivityListResponse> {
    return this.activities.list(userFrom(req), metaFrom(req), crmActivityListQuerySchema.parse(query));
  }

  @Post("comments")
  @HttpCode(HttpStatus.CREATED)
  createComment(@Req() req: AuthenticatedRequest, @Body() body: unknown): Promise<CrmActivity> {
    return this.activities.createComment(userFrom(req), metaFrom(req), createCrmCommentInputSchema.parse(body));
  }

  @Post("status")
  @HttpCode(HttpStatus.CREATED)
  createStatusActivity(@Req() req: AuthenticatedRequest, @Body() body: unknown): Promise<CrmActivity> {
    return this.activities.createStatusActivity(
      userFrom(req),
      metaFrom(req),
      createCrmStatusActivityInputSchema.parse(body),
    );
  }
}
