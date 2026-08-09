import type { Metadata } from "next";
import { SalesOrderDetailView } from "@/src/components/sales-orders/sales-order-detail-view";

export const metadata: Metadata = { title: "Sales order" };

export default async function SalesOrderDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <div className="mx-auto w-full max-w-7xl">
      <SalesOrderDetailView code={code} />
    </div>
  );
}
