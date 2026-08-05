import type { Metadata } from "next";
import { Settings } from "lucide-react";
import { ModulePage } from "@/src/components/app-shell/module-page";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <ModulePage
      title="Settings"
      description="Company, plan"
      icon={Settings}
    />
  );
}
