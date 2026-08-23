"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CircleHelp, LogOut, Settings, Shield, User } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger, Skeleton } from "@amni/ui";
import { api } from "@/src/lib/api";
import { useMe } from "@/src/hooks/use-me";

function initials(firstName: string, lastName: string | null) {
  return `${firstName.charAt(0)}${lastName?.charAt(0) ?? ""}`.toUpperCase() || "?";
}

export function UserMenu() {
  const { data: user, isPending } = useMe();
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } finally {
      queryClient.clear();
      router.replace("/login");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Open user menu">
          {isPending ? (
            <Skeleton className="h-8 w-8 rounded-full" />
          ) : (
            <Avatar className="h-8 w-8">
              <AvatarFallback>{user ? initials(user.firstName, user.lastName) : "?"}</AvatarFallback>
            </Avatar>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              {isPending || !user ? "Loading…" : `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`}
            </span>
            <span className="text-xs text-muted-foreground">{user?.email ?? "…"}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/settings")}>
          <User className="h-4 w-4" />
          Profile
          <DropdownMenuShortcut>⇧P</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push("/settings")}>
          <Settings className="h-4 w-4" />
          Settings
          <DropdownMenuShortcut>⌘,</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <CircleHelp className="h-4 w-4" />
          Help &amp; docs
        </DropdownMenuItem>
        {user?.isPlatformAdmin ? (
          <DropdownMenuItem onSelect={() => router.push("/admin")}>
            <Shield className="h-4 w-4" />
            Admin console
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleLogout} className="text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
