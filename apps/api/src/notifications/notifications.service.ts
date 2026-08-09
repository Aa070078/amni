import { Injectable } from "@nestjs/common";
import {
  ErrorCode,
  type Notification,
  type NotificationsListQuery,
  type NotificationsResponse,
} from "@amni/shared";

import { ApiException } from "../common/api.exception";

const iso = (hoursAgo: number): string => new Date(Date.now() - hoursAgo * 3_600_000).toISOString();

const SEED: Notification[] = [
  { id: "ntf-1", type: "success", title: "Invoice INV-0003 paid", body: "Serenity Interiors paid $5,000.00 by bank transfer.", href: "/sales/invoices/INV-0003", read: false, createdAt: iso(2) },
  { id: "ntf-2", type: "alert", title: "Stock is low for 3 items", body: "Nimbus LED Panel, Halide Track Light and A4 Copy Paper are at or below reorder level.", href: "/inventory/products", read: false, createdAt: iso(6) },
  { id: "ntf-3", type: "warning", title: "Purchase invoice PINV-0002 is overdue", body: "Fleetline Metals invoice of $3,032.00 is 5 days past due.", href: "/purchasing/invoices/PINV-0002", read: false, createdAt: iso(9) },
  { id: "ntf-4", type: "info", title: "Quotation QT-0018 was accepted", body: "Atlas Facilities accepted the quotation for the fit-out package.", href: "/sales/quotations/QT-0018", read: true, createdAt: iso(22) },
  { id: "ntf-5", type: "system", title: "Backup completed", body: "Nightly database backup finished successfully.", read: true, createdAt: iso(30) },
  { id: "ntf-6", type: "success", title: "Expense EXP-0003 approved", body: "Lumen Software licence expense was approved by Amara.", href: "/finance/expenses/EXP-0003", read: true, createdAt: iso(48) },
  { id: "ntf-7", type: "warning", title: "Trial ends in 7 days", body: "Your Growth plan trial converts on renewal.", href: "/settings/plan", read: false, createdAt: iso(50) },
];

/**
 * Reference data for the Demo Co tenant. Notifications read from the platform
 * notifications table once M3 wires real persistence; the contract stays the same.
 */
@Injectable()
export class NotificationsService {
  private records: Notification[] = structuredClone(SEED);

  list(query: NotificationsListQuery): NotificationsResponse {
    const items = query.unreadOnly === "true" ? this.records.filter((notification) => !notification.read) : this.records;
    return {
      items,
      unreadCount: this.records.filter((notification) => !notification.read).length,
    };
  }

  markRead(id: string): Notification {
    const notification = this.records.find((record) => record.id === id);
    if (!notification) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Notification ${id} not found` });
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
