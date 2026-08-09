import type { Metadata } from "next";
import { ContactsListView } from "@/src/components/people/contacts-list-view";

export const metadata: Metadata = { title: "Contacts · People" };

export default function ContactsPage() {
  return <ContactsListView />;
}
