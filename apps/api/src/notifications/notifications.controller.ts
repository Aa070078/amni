import { Controller, Get, Param, Patch, Query, UseGuards } from "@nestjs/common";
import {
  notificationsListQuerySchema,
  type Notification,
  type NotificationsResponse,
} from "@amni/shared";

import { AuthGuard } from "../auth/auth.guard";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@Query() query: unknown): NotificationsResponse {
    return this.notifications.list(notificationsListQuerySchema.parse(query));
  }

  @Patch(":id/read")
  markRead(@Param("id") id: string): Notification {
    return this.notifications.markRead(id);
  }

  @Patch("read-all")
  markAllRead(): NotificationsResponse {
    return this.notifications.markAllRead();
  }
}
