import type { Metadata } from "next";
import { RoundDetailView } from "@/src/components/equity/round-detail";

export const metadata: Metadata = { title: "Funding round" };

interface Props {
  params: Promise<{ code: string }>;
}

export default async function RoundDetailPage({ params }: Props) {
  const { code } = await params;
  return (
    <div className="mx-auto w-full max-w-5xl">
      <RoundDetailView code={code} />
    </div>
  );
}
