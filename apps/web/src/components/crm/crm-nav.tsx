"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  FileText,
  MessageCircle,
  PhoneCall,
  Settings2,
  StickyNote,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@amni/ui";

const CRM_LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/sales/crm", label: "Overview", icon: ClipboardList },
  { href: "/sales/crm/organizations", label: "Companies", icon: Users },
  { href: "/sales/crm/contacts", label: "Contacts", icon: UserRound },
  { href: "/sales/crm/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/sales/crm/notes", label: "Notes", icon: StickyNote },
  { href: "/sales/crm/call-logs", label: "Calls", icon: PhoneCall },
  { href: "/sales/crm/email-templates", label: "Email templates", icon: FileText },
  { href: "/sales/crm/events", label: "Events", icon: CalendarDays },
  { href: "/sales/crm/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { href: "/sales/crm/notifications", label: "Notifications", icon: Bell },
  { href: "/sales/crm/settings", label: "Settings", icon: Settings2 },
];

export function CrmNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="CRM sections" className="flex gap-1 overflow-x-auto pb-1">
      {CRM_LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function CrmSectionHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {children ? <div className="flex items-center gap-2">{children}</div> : null}
      </div>
      <CrmNav />
    </div>
  );
}
