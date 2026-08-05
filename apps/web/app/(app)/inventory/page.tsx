import type { Metadata } from "next";
import { Package } from "lucide-react";
import { ModulePage } from "@/src/components/app-shell/module-page";

export const metadata: Metadata = { title: "Inventory" };

export default function InventoryPage() {
  return (
    <ModulePage
      title="Inventory"
      description="Items, stock levels"
      icon={Package}
    />
  );
}
