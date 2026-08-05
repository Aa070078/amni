"use client";

import * as React from "react";
import { Bell, Inbox } from "lucide-react";
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@amni/ui";

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
}

const PLACEHOLDER_NOTIFICATIONS: NotificationItem[] = [
  { id: "1", title: "Sales order SO-0001 submitted", body: "Demo Co · Just now", time: "2m", unread: true },
  { id: "2", title: "Low stock: Aluminium Sheet", body: "Inventory · 1h ago", time: "1h", unread: true },
];

export function Notifications() {
  const [items, setItems] = React.useState<NotificationItem[]>(PLACEHOLDER_NOTIFICATIONS);
  const [open, setOpen] = React.useState(false);

  const unreadCount = items.filter((item) => item.unread).length;

  const markAllRead = () => setItems((prev) => prev.map((item) => ({ ...item, unread: false })));

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Notifications, ${unreadCount} unread`}>
          <Bell className="h-4 w-4" />
          {unreadCount > 0 ? (
            <span className="absolute right-1 top-1 flex h-2 w-2 rounded-full bg-destructive" />
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={markAllRead}
              className="text-xs font-normal text-muted-foreground hover:text-foreground"
            >
              Mark all as read
            </button>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <Inbox className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">You&apos;re all caught up</p>
            <p className="text-sm text-muted-foreground">We&apos;ll let you know when something needs your attention.</p>
          </div>
        ) : (
          items.map((item) => (
            <DropdownMenuItem key={item.id} className="flex flex-col items-start gap-1">
              <span className="flex items-center gap-2 text-sm font-medium">
                {item.unread ? <span className="h-1.5 w-1.5 rounded-full bg-primary" /> : null}
                {item.title}
              </span>
              <span className="text-xs text-muted-foreground">{item.body}</span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
