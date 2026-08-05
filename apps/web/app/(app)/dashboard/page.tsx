import type { Metadata } from "next";
import { LayoutDashboard } from "lucide-react";
import { ModulePage } from "@/src/components/app-shell/module-page";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <ModulePage
      title="Dashboard"
      description="Business overview"
      icon={LayoutDashboard}
    />
  );
}
