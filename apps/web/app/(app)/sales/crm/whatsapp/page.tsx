import type { Metadata } from "next";
import { WhatsAppView } from "@/src/components/crm/whatsapp-view";

export const metadata: Metadata = { title: "WhatsApp" };

export default function WhatsAppPage() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <WhatsAppView />
    </div>
  );
}
