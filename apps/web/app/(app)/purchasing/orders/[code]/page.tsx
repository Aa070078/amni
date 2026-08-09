import type { Metadata } from "next";
import { PurchaseOrderDetailView } from "@/src/components/purchase-orders/purchase-order-detail";

export const metadata: Metadata = { title: "Purchase order" };

export default async function PurchaseOrderDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <div className="mx-auto w-full max-w-7xl">
      <PurchaseOrderDetailView code={code} />
    </div>
  );
}
