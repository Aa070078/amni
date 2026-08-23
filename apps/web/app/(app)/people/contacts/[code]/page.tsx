import type { Metadata } from "next";
import { ContactDetailView } from "@/src/components/contacts/contact-detail";

export const metadata: Metadata = { title: "Contact" };

export default async function ContactDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <div className="mx-auto w-full max-w-7xl">
      <ContactDetailView code={decodeURIComponent(code)} />
    </div>
  );
}
