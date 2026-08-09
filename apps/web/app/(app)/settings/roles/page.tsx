import type { Metadata } from "next";
import { RolesView } from "@/src/components/settings/roles-view";

export const metadata: Metadata = { title: "Roles" };

export default function RolesSettingsPage() {
  return <RolesView />;
}
