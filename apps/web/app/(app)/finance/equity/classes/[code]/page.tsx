import type { Metadata } from "next";
import { ShareClassDetailView } from "@/src/components/equity/share-class-detail";

export const metadata: Metadata = { title: "Share class" };

interface Props {
  params: Promise<{ code: string }>;
}

export default async function ShareClassDetailPage({ params }: Props) {
  const { code } = await params;
  return (
    <div className="mx-auto w-full max-w-5xl">
      <ShareClassDetailView code={decodeURIComponent(code)} />
    </div>
  );
}
