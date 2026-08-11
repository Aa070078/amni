import type { Metadata } from "next";
import { CrmSettingsView } from "@/src/components/crm/crm-settings-view";

export const metadata: Metadata = { title: "CRM settings" };

export default function CrmSettingsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <CrmSettingsView />
    </div>
  );
}
