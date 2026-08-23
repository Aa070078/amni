import type { Metadata } from "next";
import { CreditNoteDetailView } from "@/src/components/invoicing/credit-note-detail";

export const metadata: Metadata = { title: "Credit note" };

interface Props {
  params: Promise<{ code: string }>;
}

export default async function CreditNoteDetailPage({ params }: Props) {
  const { code } = await params;
  return (
    <div className="mx-auto w-full max-w-5xl">
      <CreditNoteDetailView code={decodeURIComponent(code)} />
    </div>
  );
}
