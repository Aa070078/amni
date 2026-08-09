import type { Metadata } from "next";
import { TeamView } from "@/src/components/settings/team-view";

export const metadata: Metadata = { title: "Team" };

export default function TeamSettingsPage() {
  return <TeamView />;
}
