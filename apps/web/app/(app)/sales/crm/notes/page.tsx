import type { Metadata } from "next";
import { NotesView } from "@/src/components/crm/notes-view";

export const metadata: Metadata = { title: "Notes" };

export default function NotesPage() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <NotesView />
    </div>
  );
}
