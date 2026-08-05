import type { Metadata } from "next";
import { AppShell } from "@/src/components/app-shell/app-shell";

export const metadata: Metadata = {
  title: {
    default: "Amni",
    template: "%s · Amni",
  },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
