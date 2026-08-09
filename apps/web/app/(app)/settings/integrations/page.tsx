import type { Metadata } from "next";
import { IntegrationsView } from "@/src/components/settings/integrations-view";

export const metadata: Metadata = { title: "Integrations" };

export default function IntegrationsSettingsPage() {
  return <IntegrationsView />;
}
