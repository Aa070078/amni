import type { Metadata } from "next";
import { QuotationsView } from "@/src/components/quotations/quotations-view";

export const metadata: Metadata = { title: "Quotations" };

export default function QuotationsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <QuotationsView />
    </div>
  );
}
