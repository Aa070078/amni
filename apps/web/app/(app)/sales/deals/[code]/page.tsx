import type { Metadata } from "next";
import { DealDetailView } from "@/src/components/deals/deal-detail-view";

export const metadata: Metadata = { title: "Deal detail" };

export default async function DealDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <div className="mx-auto w-full max-w-7xl">
      <DealDetailView code={decodeURIComponent(code)} />
    </div>
  );
}
