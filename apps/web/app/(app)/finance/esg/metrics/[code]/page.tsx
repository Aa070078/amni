import type { Metadata } from "next";
import { EsgMetricDetailView } from "@/src/components/esg/esg-metric-detail";

export const metadata: Metadata = { title: "ESG metric" };

interface Props {
  params: Promise<{ code: string }>;
}

export default async function EsgMetricDetailPage({ params }: Props) {
  const { code } = await params;
  return (
    <div className="mx-auto w-full max-w-5xl">
      <EsgMetricDetailView code={code} />
    </div>
  );
}
