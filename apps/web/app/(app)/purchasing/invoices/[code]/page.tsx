import type { Metadata } from "next";
import { PurchaseInvoiceDetailView } from "@/src/components/purchase-invoices/purchase-invoice-detail";

export const metadata: Metadata = { title: "Purchase invoice" };

export default async function PurchaseInvoiceDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <div className="mx-auto w-full max-w-7xl">
      <PurchaseInvoiceDetailView code={decodeURIComponent(code)} />
    </div>
  );
}
