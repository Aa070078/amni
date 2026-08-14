"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import type { NotificationType } from "@amni/shared";
import { Button, Card, CardContent, Skeleton } from "@amni/ui";
import { crmClient, formatCrmDateTime } from "@/src/lib/crm";
import { CrmSectionHeader } from "./crm-nav";

const TYPE_META: Record<NotificationType, { dot: string; label: string }> = {
  info: { dot: "bg-sky-500", label: "Info" },
  success: { dot: "bg-success", label: "Success" },
  warning: { dot: "bg-warning", label: "Warning" },
  alert: { dot: "bg-destructive", label: "Alert" },
  system: { dot: "bg-foreground/60", label: "System" },
};

export function NotificationsView() {
  const queryClient = useQueryClient();
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const notificationsQuery = useQuery({
    queryKey: ["crm", "notifications", { unreadOnly: showUnreadOnly }],
    queryFn: () => crmClient.notifications.list(),
    placeholderData: (previous) => previous,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => crmClient.notifications.markRead(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["crm", "notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => crmClient.notifications.markAllRead(),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["crm", "notifications"] }),
  });

  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;
  const items = (notificationsQuery.data?.items ?? []).filter(
    (notification) => !showUnreadOnly || !notification.read
  );

  return (
    <div className="space-y-6">
      <CrmSectionHeader title="Notifications" description="Stay on top of activity across your CRM.">
        <Button
          variant="outline"
          size="sm"
          onClick={() => markAllRead.mutate()}
          disabled={markAllRead.isPending || unreadCount === 0}
        >
          <CheckCheck className="mr-2 h-4 w-4" aria-hidden="true" />
          Mark all read
        </Button>
      </CrmSectionHeader>

      <div className="flex items-center gap-3">
        <Button
          variant={showUnreadOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setShowUnreadOnly((value) => !value)}
          aria-pressed={showUnreadOnly}
        >
          Unread only
        </Button>
        <span className="text-sm text-muted-foreground">
          {unreadCount} unread {unreadCount === 1 ? "notification" : "notifications"}
        </span>
      </div>

      {notificationsQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : notificationsQuery.isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <Bell className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-base font-semibold">Couldn&apos;t load notifications</p>
              <p className="text-sm text-muted-foreground">Something went wrong. Please try again.</p>
            </div>
            <Button variant="outline" onClick={() => void notificationsQuery.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <Bell className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-base font-semibold">
                {showUnreadOnly ? "No unread notifications" : "No notifications yet"}
              </p>
              <p className="text-sm text-muted-foreground">
                {showUnreadOnly ? "You&apos;re all caught up." : "Activity across your CRM will show up here."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {items.map((notification) => {
            const meta = TYPE_META[notification.type];
            const content = (
              <>
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${meta.dot}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`text-sm ${notification.read ? "font-normal text-muted-foreground" : "font-medium text-foreground"}`}>
                      {notification.title}
                    </p>
                    {!notification.read ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        New
                      </span>
                    ) : null}
                  </div>
                  {notification.body ? (
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{notification.body}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground">{formatCrmDateTime(notification.createdAt)}</p>
                </div>
              </>
            );
            return (
              <li
                key={notification.id}
                className={`flex items-start gap-3 rounded-lg border p-4 ${notification.read ? "bg-card" : "bg-muted/40"}`}
              >
                {notification.href ? (
                  <Link href={notification.href} className="flex min-w-0 flex-1 items-start gap-3">
                    {content}
                  </Link>
                ) : (
                  content
                )}
                {!notification.read ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={() => markRead.mutate(notification.id)}
                    disabled={markRead.isPending}
                    aria-label="Mark as read"
                  >
                    <CheckCheck className="h-4 w-4" aria-hidden="true" />
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
