import { Injectable } from "@nestjs/common";
import { prisma } from "@amni/db";
import {
  ErrorCode,
  type Notification,
  type NotificationsListQuery,
  type NotificationsResponse,
} from "@amni/shared";

import { ApiException } from "../common/api.exception";

/**
 * M4-001: notifications now persist in the platform `notifications` table
 * (written by the worker's NOTIFY processor). The API is strictly a read /
 * mark-read surface, scoped to the authenticated user. The response contract
 * is unchanged.
 */
@Injectable()
export class NotificationsService {
  async list(userId: string, query: NotificationsListQuery): Promise<NotificationsResponse> {
    const items = await prisma.notification.findMany({
      where: {
        userId,
        ...(query.unreadOnly === "true" ? { readAt: null } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, readAt: null },
    });

    return { items: items.map(toNotification), unreadCount };
  }

  async markRead(id: string, userId: string): Promise<Notification> {
    const updated = await prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
    if (updated.count === 0) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Notification ${id} not found` });
    }

    const notification = await prisma.notification.findUnique({ where: { id } });
    return toNotification(notification!);
  }

  async markAllRead(userId: string): Promise<NotificationsResponse> {
    await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });

    return this.list(userId, {});
  }
}

function toNotification(row: {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
}): Notification {
  return {
    id: row.id,
    type: row.type as Notification["type"],
    title: row.title,
    body: row.body ?? undefined,
    href: row.link ?? undefined,
    read: row.readAt !== null,
    createdAt: row.createdAt.toISOString(),
  };
}
