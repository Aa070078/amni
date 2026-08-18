import type { Metadata } from "next";
import { ShareholderDetailView } from "@/src/components/equity/shareholder-detail";

export const metadata: Metadata = { title: "Shareholder" };

interface Props {
  params: Promise<{ code: string }>;
}

export default async function ShareholderDetailPage({ params }: Props) {
  const { code } = await params;
  return (
    <div className="mx-auto w-full max-w-5xl">
      <ShareholderDetailView code={decodeURIComponent(code)} />
    </div>
  );
}
