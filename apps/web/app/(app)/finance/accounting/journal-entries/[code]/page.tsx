import type { Metadata } from "next";
import { JournalEntryDetailView } from "@/src/components/accounting/journal-entry-detail";

export const metadata: Metadata = { title: "Journal entry" };

interface Props {
  params: Promise<{ code: string }>;
}

export default async function JournalEntryDetailPage({ params }: Props) {
  const { code } = await params;
  return (
    <div className="mx-auto w-full max-w-5xl">
      <JournalEntryDetailView code={code} />
    </div>
  );
}
