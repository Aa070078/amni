import type { Metadata } from "next";
import { NoteDetailView } from "@/src/components/crm/notes/note-detail-view";

export const metadata: Metadata = { title: "Note detail" };

export default async function NoteDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <div className="mx-auto w-full max-w-7xl">
      <NoteDetailView code={code} />
    </div>
  );
}
