import type { Metadata } from "next";
import { EventsView } from "@/src/components/crm/events-view";

export const metadata: Metadata = { title: "Events" };

export default function EventsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <EventsView />
    </div>
  );
}
