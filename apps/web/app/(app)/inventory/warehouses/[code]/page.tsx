import type { Metadata } from "next";
import { WarehouseDetailView } from "@/src/components/warehouses/warehouse-detail-view";

export const metadata: Metadata = { title: "Warehouse detail" };

export default async function WarehouseDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <div className="mx-auto w-full max-w-7xl">
      <WarehouseDetailView code={code} />
    </div>
  );
}
