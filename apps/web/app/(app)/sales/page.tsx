import type { Metadata } from "next";
import { Handshake } from "lucide-react";
import { ModulePage } from "@/src/components/app-shell/module-page";

export const metadata: Metadata = { title: "Sales" };

export default function SalesPage() {
  return (
    <ModulePage
      title="Sales"
      description="Customers, quotes, orders"
      icon={Handshake}
    />
  );
}
