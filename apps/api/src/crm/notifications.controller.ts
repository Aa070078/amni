import { Controller, Get, HttpCode, HttpStatus, Param, Patch, Query, Req, UseGuards } from "@nestjs/common";
import { notificationsListQuerySchema, type Notification, type NotificationsResponse } from "@amni/shared";

import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { AllowMemberMutation } from "../auth/authorization.decorator";
import { metaFrom, userFrom } from "../common/request-context";
// Value import required so TypeScript emits Nest constructor metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmNotificationsService } from "./notifications.service";

@Controller("sales/crm/notifications")
@UseGuards(AuthGuard)
@AllowMemberMutation()
export class CrmNotificationsController {
  constructor(private readonly notifications: CrmNotificationsService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest, @Query() query: unknown): Promise<NotificationsResponse> {
    return this.notifications.list(userFrom(req), metaFrom(req), notificationsListQuerySchema.parse(query).unreadOnly);
  }

  @Patch("read-all")
  @HttpCode(HttpStatus.OK)
  markAllRead(@Req() req: AuthenticatedRequest): Promise<NotificationsResponse> {
    return this.notifications.markAllRead(userFrom(req), metaFrom(req));
  }

  @Patch(":id/read")
  @HttpCode(HttpStatus.OK)
  markRead(@Req() req: AuthenticatedRequest, @Param("id") id: string): Promise<Notification> {
    return this.notifications.markRead(userFrom(req), metaFrom(req), id);
  }
}
