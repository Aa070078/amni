import type { Metadata } from "next";
import { PurchaseInvoicesView } from "@/src/components/purchase-invoices/purchase-invoices-view";

export const metadata: Metadata = { title: "Purchase invoices" };

export default function PurchaseInvoicesPage() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <PurchaseInvoicesView />
    </div>
  );
}
