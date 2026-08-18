import type { Metadata } from "next";
import { LeadDetailView } from "@/src/components/leads/lead-detail-view";

export const metadata: Metadata = { title: "Lead detail" };

export default async function LeadDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <div className="mx-auto w-full max-w-7xl">
      <LeadDetailView code={decodeURIComponent(code)} />
    </div>
  );
}
