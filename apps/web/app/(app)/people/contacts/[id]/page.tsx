import type { Metadata } from "next";
import { ContactDetailView } from "@/src/components/people/contact-detail-view";

export const metadata: Metadata = { title: "Contact · People" };

export default async function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ContactDetailView id={id} />;
}
