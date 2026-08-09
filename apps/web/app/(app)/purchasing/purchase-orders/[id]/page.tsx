import type { Metadata } from "next";
import { PurchaseOrderDetailView } from "@/src/components/purchasing/purchase-order-detail-view";

export const metadata: Metadata = { title: "Purchase order · Purchasing" };

export default async function PurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PurchaseOrderDetailView id={id} />;
}
