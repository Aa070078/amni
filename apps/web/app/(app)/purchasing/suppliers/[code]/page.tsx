import type { Metadata } from "next";
import { SupplierDetailView } from "@/src/components/suppliers/supplier-detail";

export const metadata: Metadata = { title: "Supplier" };

export default async function SupplierDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <div className="mx-auto w-full max-w-7xl">
      <SupplierDetailView code={decodeURIComponent(code)} />
    </div>
  );
}
