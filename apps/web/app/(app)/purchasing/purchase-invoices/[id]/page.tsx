import type { Metadata } from "next";
import { PurchaseInvoiceDetailView } from "@/src/components/purchasing/purchase-invoice-detail-view";

export const metadata: Metadata = { title: "Purchase invoice · Purchasing" };

export default async function PurchaseInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PurchaseInvoiceDetailView id={id} />;
}
