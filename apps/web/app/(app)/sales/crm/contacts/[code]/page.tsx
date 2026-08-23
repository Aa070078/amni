import type { Metadata } from "next";
import { ContactDetailView } from "@/src/components/crm/contacts/contact-detail-view";

export const metadata: Metadata = { title: "Contact detail" };

export default async function ContactDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <div className="mx-auto w-full max-w-7xl">
      <ContactDetailView code={decodeURIComponent(code)} />
    </div>
  );
}
