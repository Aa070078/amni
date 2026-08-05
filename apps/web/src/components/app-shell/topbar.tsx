"use client";

import * as React from "react";
import { Menu, Plus, Search } from "lucide-react";
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Separator } from "@amni/ui";
import { ThemeToggle } from "./theme-toggle";
import { Notifications } from "./notifications";
import { UserMenu } from "./user-menu";

interface TopbarProps {
  onMenuClick: () => void;
  onSearchClick: () => void;
}

export function Topbar({ onMenuClick, onSearchClick }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:px-4">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label="Open navigation"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex flex-1 items-center gap-2">
        <Button
          variant="outline"
          onClick={onSearchClick}
          className="hidden w-full max-w-xs justify-start gap-2 px-2 text-muted-foreground sm:flex"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left text-sm">Search…</span>
          <kbd className="pointer-events-none hidden select-none rounded border bg-muted px-1.5 font-mono text-[10px] font-medium sm:inline-flex">
            ⌘K
          </kbd>
        </Button>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="hidden gap-1 md:inline-flex">
              <Plus className="h-4 w-4" />
              New
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>Create</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Sales order</DropdownMenuItem>
            <DropdownMenuItem>Purchase order</DropdownMenuItem>
            <DropdownMenuItem>Item</DropdownMenuItem>
            <DropdownMenuItem>Customer</DropdownMenuItem>
            <DropdownMenuItem>Invoice</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Separator orientation="vertical" className="mx-1 hidden h-6 md:block" />
        <ThemeToggle />
        <Notifications />
        <UserMenu />
      </div>
    </header>
  );
}
