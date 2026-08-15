"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, LayoutDashboard, Users } from "lucide-react";
import { Skeleton } from "@amni/ui";
import { cn } from "@amni/ui";
import { useMe } from "@/src/hooks/use-me";
import { AdminAccessDenied } from "./admin-access-denied";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/tenants", label: "Tenants", icon: Users },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: user, isPending } = useMe();

  if (isPending) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-20 border-b bg-background">
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 lg:px-8">
            <Skeleton className="h-5 w-40" />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 lg:px-8">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-40 w-full" />
        </main>
      </div>
    );
  }

  if (!user?.isPlatformAdmin) {
    return <AdminAccessDenied />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-background">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-4">
            <ButtonLink />
            <h1 className="text-lg font-semibold tracking-tight">Admin console</h1>
          </div>
          <nav className="flex items-center gap-1" aria-label="Admin sections">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                    active && "bg-muted text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 lg:px-8">{children}</main>
    </div>
  );
}

function ButtonLink() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Back to app
    </Link>
  );
}
