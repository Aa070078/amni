import type { Notification, NotificationsResponse } from "@amni/shared";

import { apiRequest } from "./client";

export const notificationsClient = {
  list(unreadOnly?: boolean): Promise<NotificationsResponse> {
    const qs = unreadOnly ? "?unreadOnly=true" : "";
    return apiRequest<NotificationsResponse>("/notifications", qs);
  },
  markRead(id: string): Promise<Notification> {
    return apiRequest<Notification>("/notifications", `/${encodeURIComponent(id)}/read`, { method: "PATCH" });
  },
  markAllRead(): Promise<NotificationsResponse> {
    return apiRequest<NotificationsResponse>("/notifications", "/read-all", { method: "PATCH" });
  },
};
