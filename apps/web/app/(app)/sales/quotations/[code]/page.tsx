import type { Metadata } from "next";
import { QuotationDetailView } from "@/src/components/quotations/quotation-detail-view";

export const metadata: Metadata = { title: "Quotation detail" };

export default async function QuotationDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <div className="mx-auto w-full max-w-7xl">
      <QuotationDetailView code={decodeURIComponent(code)} />
    </div>
  );
}
