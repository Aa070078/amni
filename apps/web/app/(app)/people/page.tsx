import type { Metadata } from "next";
import { Users } from "lucide-react";
import { ModulePage } from "@/src/components/app-shell/module-page";

export const metadata: Metadata = { title: "People" };

export default function PeoplePage() {
  return (
    <ModulePage
      title="People"
      description="Contacts, access"
      icon={Users}
    />
  );
}
