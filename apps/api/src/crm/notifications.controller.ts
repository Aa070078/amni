import { Controller, Get, HttpCode, HttpStatus, Param, Patch, Query, UseGuards } from "@nestjs/common";
import { notificationsListQuerySchema, type Notification, type NotificationsResponse } from "@amni/shared";

import { AuthGuard } from "../auth/auth.guard";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmNotificationsService } from "./notifications.service";

@Controller("sales/crm/notifications")
@UseGuards(AuthGuard)
export class CrmNotificationsController {
  constructor(private readonly notifications: CrmNotificationsService) {}

  @Get()
  list(@Query() query: unknown): NotificationsResponse {
    return this.notifications.list(notificationsListQuerySchema.parse(query).unreadOnly);
  }

  @Patch("read-all")
  @HttpCode(HttpStatus.OK)
  markAllRead(): NotificationsResponse {
    return this.notifications.markAllRead();
  }

  @Patch(":id/read")
  @HttpCode(HttpStatus.OK)
  markRead(@Param("id") id: string): Notification {
    return this.notifications.markRead(id);
  }
}
