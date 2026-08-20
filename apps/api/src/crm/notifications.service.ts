import { Injectable } from "@nestjs/common";
import { ErrorCode, type Notification, type NotificationType, type NotificationsResponse } from "@amni/shared";

import { ApiException } from "../common/api.exception";
import type { GatewayRequestMeta, GatewayUser } from "../erp-gateway/erp-gateway.service";
import { newId } from "./crm-common";
// Value import required so TypeScript emits Nest constructor metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmRecordRepository } from "./crm-record.repository";

interface StoredNotification extends Notification {
  recipientEmail: string;
}

@Injectable()
export class CrmNotificationsService {
  constructor(private readonly records: CrmRecordRepository) {}

  async add(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    input: { type: NotificationType; title: string; body?: string; href?: string },
  ): Promise<Notification> {
    const notification: StoredNotification = {
      id: newId("crm-ntf"),
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href,
      read: false,
      createdAt: new Date().toISOString(),
      recipientEmail: user.email,
    };
    const created = await this.records.create(user, meta, "notification", notification.id, notification, {
      title: notification.title,
      status: "unread",
      assignedTo: user.email,
      searchText: [notification.title, notification.body].filter(Boolean).join(" "),
    });
    return publicNotification(created);
  }

  async list(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    unreadOnly: string | undefined,
  ): Promise<NotificationsResponse> {
    const [page, unread] = await Promise.all([
      this.records.list<StoredNotification>(user, meta, "notification", {
        filters: { assigned_to: user.email, status: unreadOnly === "true" ? "unread" : undefined },
        orderBy: "creation desc",
        pageLength: 100,
      }),
      this.records.list<StoredNotification>(user, meta, "notification", {
        filters: { assigned_to: user.email, status: "unread" },
        pageLength: 1,
      }),
    ]);
    return { items: page.items.map(publicNotification), unreadCount: unread.total };
  }

  async markRead(user: GatewayUser, meta: GatewayRequestMeta, id: string): Promise<Notification> {
    const notification = await this.getForUser(user, meta, id);
    const updated: StoredNotification = { ...notification, read: true };
    return publicNotification(
      await this.records.update(user, meta, "notification", id, updated, {
        title: updated.title,
        status: "read",
        assignedTo: user.email,
        searchText: [updated.title, updated.body].filter(Boolean).join(" "),
      }),
    );
  }

  async markAllRead(user: GatewayUser, meta: GatewayRequestMeta): Promise<NotificationsResponse> {
    for (;;) {
      const unread = await this.records.list<StoredNotification>(user, meta, "notification", {
        filters: { assigned_to: user.email, status: "unread" },
        pageLength: 100,
      });
      if (unread.items.length === 0) break;
      await Promise.all(unread.items.map((item) => this.markRead(user, meta, item.id)));
    }
    return this.list(user, meta, undefined);
  }

  private async getForUser(user: GatewayUser, meta: GatewayRequestMeta, id: string): Promise<StoredNotification> {
    const notification = await this.records.get<StoredNotification>(user, meta, "notification", id);
    if (notification.recipientEmail !== user.email) {
      throw new ApiException({
        code: ErrorCode.NOT_FOUND,
        status: 404,
        message: `CRM notification ${id} not found`,
      });
    }
    return notification;
  }
}

function publicNotification(notification: StoredNotification): Notification {
  const { recipientEmail: _recipientEmail, ...publicRecord } = notification;
  return publicRecord;
}
