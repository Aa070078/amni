import type { Metadata } from "next";
import { ProfileView } from "@/src/components/settings/profile-view";

export const metadata: Metadata = { title: "Profile" };

export default function ProfileSettingsPage() {
  return <ProfileView />;
}
