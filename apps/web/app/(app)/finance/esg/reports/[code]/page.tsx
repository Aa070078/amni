import type { Metadata } from "next";
import { EsgReportDetailView } from "@/src/components/esg/esg-report-detail";

export const metadata: Metadata = { title: "ESG report" };

interface Props {
  params: Promise<{ code: string }>;
}

export default async function EsgReportDetailPage({ params }: Props) {
  const { code } = await params;
  return (
    <div className="mx-auto w-full max-w-5xl">
      <EsgReportDetailView code={code} />
    </div>
  );
}
