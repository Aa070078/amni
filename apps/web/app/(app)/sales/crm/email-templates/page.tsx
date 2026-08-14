import type { Metadata } from "next";
import { EmailTemplatesView } from "@/src/components/crm/email-templates-view";

export const metadata: Metadata = { title: "Email templates" };

export default function EmailTemplatesPage() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <EmailTemplatesView />
    </div>
  );
}
