"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Inbox, Loader2 } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@amni/ui";
import { formatRelativeTime } from "@/src/lib/format";
import { notificationsClient } from "@/src/lib/notifications";
import type { NotificationsResponse } from "@amni/shared";

export function Notifications() {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);

  const listQuery = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: () => notificationsClient.list(),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsClient.markAllRead(),
    onSuccess: (data) => {
      queryClient.setQueryData(["notifications", "list"], data);
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsClient.markRead(id),
    onSuccess: (updated) => {
      queryClient.setQueryData(["notifications", "list"], (current: NotificationsResponse | undefined) => {
        if (!current) return current;
        return {
          ...current,
          unreadCount: Math.max(0, current.unreadCount - 1),
          items: current.items.map((item) => (item.id === updated.id ? { ...item, read: true } : item)),
        };
      });
    },
  });

  const items = listQuery.data?.items ?? [];
  const unreadCount = listQuery.data?.unreadCount ?? 0;
  const loading = listQuery.isLoading;

  const markAllRead = () => {
    markAllMutation.mutate();
  };

  const markItemRead = (id: string) => {
    markReadMutation.mutate(id);
  };

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
              disabled={markAllMutation.isPending}
              className="text-xs font-normal text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              {markAllMutation.isPending ? "Marking…" : "Mark all as read"}
            </button>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {loading ? (
          <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <Inbox className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">You&apos;re all caught up</p>
            <p className="text-sm text-muted-foreground">
              We&apos;ll let you know when something needs your attention.
            </p>
          </div>
        ) : (
          items.map((item) => {
            const content = (
              <>
                <span className="flex items-center gap-2 text-sm font-medium">
                  {!item.read ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /> : null}
                  <span className="truncate">{item.title}</span>
                </span>
                {item.body ? <span className="text-xs text-muted-foreground">{item.body}</span> : null}
                <span className="text-[11px] text-muted-foreground">{formatRelativeTime(item.createdAt)}</span>
              </>
            );
            const wrapped = item.href ? (
              <Link
                href={item.href}
                className="flex w-full flex-col items-start gap-1"
                onClick={() => {
                  if (!item.read) markItemRead(item.id);
                  setOpen(false);
                }}
              >
                {content}
              </Link>
            ) : (
              <button
                type="button"
                className="flex w-full flex-col items-start gap-1 text-left"
                onClick={() => {
                  if (!item.read) markItemRead(item.id);
                }}
              >
                {content}
              </button>
            );
            return (
              <DropdownMenuItem
                key={item.id}
                className="flex flex-col items-start gap-1"
                onSelect={(event) => event.preventDefault()}
              >
                {wrapped}
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
