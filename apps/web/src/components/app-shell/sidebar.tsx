"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Command } from "lucide-react";
import { Button, Sheet, SheetContent, SheetTitle, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@amni/ui";
import { appModules, isModuleActive } from "@/src/lib/nav";
import { TenantSwitcher } from "./tenant-switcher";
import { cn } from "@amni/ui";

interface SidebarProps {
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

export function Sidebar({ mobileOpen, onMobileOpenChange }: SidebarProps) {
  const pathname = usePathname();

  return (
    <TooltipProvider delayDuration={200}>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-sidebar lg:flex">
        <SidebarContent pathname={pathname} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="w-72 p-0 sm:max-w-xs">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent pathname={pathname} onNavigate={() => onMobileOpenChange(false)} />
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}

function SidebarContent({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto px-3 py-4">
      <div className="flex items-center gap-2 px-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary font-bold text-primary-foreground">
          A
        </span>
        <span className="text-lg font-semibold tracking-tight">Amni</span>
      </div>

      <TenantSwitcher />

      <nav className="mt-2 flex flex-1 flex-col gap-1" aria-label="Modules">
        {appModules.map((module) => {
          const active = isModuleActive(pathname, module.href);
          const Icon = module.icon;
          return (
            <Tooltip key={module.href}>
              <TooltipTrigger asChild>
                <Button
                  asChild
                  variant="ghost"
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "h-9 w-full justify-start gap-3 px-2 text-sm",
                    active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Link href={module.href} onClick={onNavigate}>
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{module.title}</span>
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="hidden lg:block">
                {module.title} — {module.intent}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      <div className="flex items-center justify-between rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Command className="h-3.5 w-3.5" />
          Command menu
        </span>
        <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">⌘K</kbd>
      </div>
    </div>
  );
}
