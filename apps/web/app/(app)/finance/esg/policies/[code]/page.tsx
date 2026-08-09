import type { Metadata } from "next";
import { EsgPolicyDetailView } from "@/src/components/esg/esg-policy-detail";

export const metadata: Metadata = { title: "ESG policy" };

interface Props {
  params: Promise<{ code: string }>;
}

export default async function EsgPolicyDetailPage({ params }: Props) {
  const { code } = await params;
  return (
    <div className="mx-auto w-full max-w-5xl">
      <EsgPolicyDetailView code={code} />
    </div>
  );
}
