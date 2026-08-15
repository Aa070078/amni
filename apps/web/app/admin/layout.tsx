import type { Metadata } from "next";
import { AdminShell } from "@/src/components/admin/admin-shell";

export const metadata: Metadata = {
  title: "Admin console · Amni",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
