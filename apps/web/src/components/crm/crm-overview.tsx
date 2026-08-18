"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  Building2,
  CalendarDays,
  CheckSquare,
  FileText,
  MessageSquare,
  Phone,
  Settings2,
  StickyNote,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@amni/ui";
import { crmClient } from "@/src/lib/crm";
import { CrmSectionHeader } from "./crm-nav";

const SECTIONS = [
  {
    title: "Records",
    links: [
      { href: "/crm/organizations", label: "Companies", icon: Building2 },
      { href: "/crm/contacts", label: "Contacts", icon: Users },
      { href: "/crm/tasks", label: "Tasks", icon: CheckSquare },
      { href: "/crm/notes", label: "Notes", icon: StickyNote },
    ],
  },
  {
    title: "Communication",
    links: [
      { href: "/crm/call-logs", label: "Call logs", icon: Phone },
      { href: "/crm/whatsapp", label: "WhatsApp", icon: MessageSquare },
      { href: "/crm/email-templates", label: "Email templates", icon: FileText },
    ],
  },
  {
    title: "Workspace",
    links: [
      { href: "/crm/events", label: "Events", icon: CalendarDays },
      { href: "/crm/notifications", label: "Notifications", icon: Bell },
      { href: "/crm/settings", label: "Settings", icon: Settings2 },
    ],
  },
];

export function CrmOverview() {
  const notificationsQuery = useQuery({
    queryKey: ["crm", "notifications", "overview"],
    queryFn: () => crmClient.notifications.list(),
  });

  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;

  return (
    <div className="space-y-6">
      <CrmSectionHeader
        title="CRM"
        description="Manage companies, contacts, and every interaction across your sales process."
      />

      <div className="grid gap-6 md:grid-cols-3">
        {SECTIONS.map((section) => (
          <Card key={section.title}>
            <CardContent className="p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {section.title}
              </h2>
              <ul className="mt-4 space-y-1">
                {section.links.map(({ href, label, icon: Icon }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="flex items-center gap-3 rounded-md px-2 py-2 text-sm text-foreground hover:bg-accent"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="flex-1">{label}</span>
                      {href === "/crm/notifications" && unreadCount > 0 ? (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium tabular-nums text-primary-foreground">
                          {unreadCount}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
