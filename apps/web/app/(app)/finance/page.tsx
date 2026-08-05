import type { Metadata } from "next";
import { Landmark } from "lucide-react";
import { ModulePage } from "@/src/components/app-shell/module-page";

export const metadata: Metadata = { title: "Finance" };

export default function FinancePage() {
  return (
    <ModulePage
      title="Finance"
      description="Invoices, payments"
      icon={Landmark}
    />
  );
}
