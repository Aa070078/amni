"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, CreditCard, Plug, ShieldCheck, User, Users } from "lucide-react";

const SETTINGS_NAV = [
  { title: "Company", href: "/settings/company", icon: Building2 },
  { title: "Team", href: "/settings/team", icon: Users },
  { title: "Roles", href: "/settings/roles", icon: ShieldCheck },
  { title: "Plan & billing", href: "/settings/plan", icon: CreditCard },
  { title: "Integrations", href: "/settings/integrations", icon: Plug },
  { title: "Profile", href: "/settings/profile", icon: User },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Settings" className="space-y-1">
      {SETTINGS_NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            ].join(" ")}
          >
            <item.icon className="h-4 w-4" aria-hidden="true" />
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
