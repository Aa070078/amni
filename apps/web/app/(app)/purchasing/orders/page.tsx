import type { Metadata } from "next";
import { PurchaseOrdersView } from "@/src/components/purchase-orders/purchase-orders-view";

export const metadata: Metadata = { title: "Purchase orders" };

export default function PurchaseOrdersPage() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <PurchaseOrdersView />
    </div>
  );
}
