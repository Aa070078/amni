import type { Metadata } from "next";
import { SalesInvoiceDetailView } from "@/src/components/sales-invoices/sales-invoice-detail-view";

export const metadata: Metadata = { title: "Sales invoice" };

export default async function SalesInvoiceDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <div className="mx-auto w-full max-w-7xl">
      <SalesInvoiceDetailView code={code} />
    </div>
  );
}
