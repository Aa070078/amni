import type { Metadata } from "next";
import { ShoppingCart } from "lucide-react";
import { ModulePage } from "@/src/components/app-shell/module-page";

export const metadata: Metadata = { title: "Purchasing" };

export default function PurchasingPage() {
  return (
    <ModulePage
      title="Purchasing"
      description="Suppliers, purchase orders"
      icon={ShoppingCart}
    />
  );
}
