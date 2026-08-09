import type { Metadata } from "next";
import { PurchaseOrdersListView } from "@/src/components/purchasing/purchase-orders-list-view";

export const metadata: Metadata = { title: "Purchase orders · Purchasing" };

export default function PurchaseOrdersPage() {
  return <PurchaseOrdersListView />;
}
