import { Controller, Get, Param, Patch, Query, UseGuards } from "@nestjs/common";
import {
  notificationsListQuerySchema,
  type Notification,
  type NotificationsResponse,
} from "@amni/shared";

import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { AllowMemberMutation } from "../auth/authorization.decorator";
import { CurrentUser } from "../auth/request.decorators";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
@UseGuards(AuthGuard)
@AllowMemberMutation()
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(
    @Query() query: unknown,
    @CurrentUser() user: AuthenticatedRequest["user"],
  ): Promise<NotificationsResponse> {
    return this.notifications.list(user!.id, notificationsListQuerySchema.parse(query));
  }

  @Patch(":id/read")
  markRead(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedRequest["user"],
  ): Promise<Notification> {
    return this.notifications.markRead(id, user!.id);
  }

  @Patch("read-all")
  markAllRead(@CurrentUser() user: AuthenticatedRequest["user"]): Promise<NotificationsResponse> {
    return this.notifications.markAllRead(user!.id);
  }
}
