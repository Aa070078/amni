import type { Metadata } from "next";
import { PurchaseInvoicesListView } from "@/src/components/purchasing/purchase-invoices-list-view";

export const metadata: Metadata = { title: "Purchase invoices · Purchasing" };

export default function PurchaseInvoicesPage() {
  return <PurchaseInvoicesListView />;
}
