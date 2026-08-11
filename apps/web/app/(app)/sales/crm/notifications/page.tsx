import type { Metadata } from "next";
import { NotificationsView } from "@/src/components/crm/notifications-view";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <NotificationsView />
    </div>
  );
}
