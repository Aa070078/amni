import type { Metadata } from "next";
import { SettingsNav } from "@/src/components/settings/settings-nav";

export const metadata: Metadata = {
  title: {
    default: "Settings",
    template: "%s — Settings",
  },
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your company, team and plan</p>
      </div>
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <SettingsNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
