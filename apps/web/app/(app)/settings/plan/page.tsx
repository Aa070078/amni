import type { Metadata } from "next";
import { PlanView } from "@/src/components/settings/plan-view";

export const metadata: Metadata = { title: "Plan & billing" };

export default function PlanSettingsPage() {
  return <PlanView />;
}
