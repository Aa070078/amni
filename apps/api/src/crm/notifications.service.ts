import { Injectable } from "@nestjs/common";
import {
  ErrorCode,
  type Notification,
  type NotificationType,
  type NotificationsResponse,
} from "@amni/shared";

import { ApiException } from "../common/api.exception";
import { newId } from "./crm-common";

@Injectable()
export class CrmNotificationsService {
  private records: Notification[] = [];

  add(input: { type: NotificationType; title: string; body?: string; href?: string }): Notification {
    const notification: Notification = {
      id: newId("crm-ntf"),
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href,
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.records.unshift(notification);
    return notification;
  }

  list(unreadOnly: string | undefined): NotificationsResponse {
    const items = unreadOnly === "true" ? this.records.filter((notification) => !notification.read) : this.records;
    return {
      items,
      unreadCount: this.records.filter((notification) => !notification.read).length,
    };
  }

  markRead(id: string): Notification {
    const notification = this.records.find((record) => record.id === id);
    if (!notification) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `CRM notification ${id} not found` });
    }
    notification.read = true;
    return notification;
  }

  markAllRead(): NotificationsResponse {
    for (const notification of this.records) {
      notification.read = true;
    }
    return { items: this.records, unreadCount: 0 };
  }
}
