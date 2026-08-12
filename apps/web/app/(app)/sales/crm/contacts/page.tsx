import type { Metadata } from "next";
import { ContactsView } from "@/src/components/crm/contacts-view";

export const metadata: Metadata = { title: "Contacts" };

export default function ContactsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <ContactsView />
    </div>
  );
}
