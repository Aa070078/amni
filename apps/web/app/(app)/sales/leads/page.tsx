import type { Metadata } from "next";
import { LeadsView } from "@/src/components/leads/leads-view";

export const metadata: Metadata = { title: "Leads" };

export default function LeadsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <LeadsView />
    </div>
  );
}
