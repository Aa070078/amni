import type { Metadata } from "next";
import { EsgBoardMemberDetailView } from "@/src/components/esg/esg-board-member-detail";

export const metadata: Metadata = { title: "Board member" };

interface Props {
  params: Promise<{ code: string }>;
}

export default async function EsgBoardMemberDetailPage({ params }: Props) {
  const { code } = await params;
  return (
    <div className="mx-auto w-full max-w-5xl">
      <EsgBoardMemberDetailView code={code} />
    </div>
  );
}
