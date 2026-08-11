import type { Metadata } from "next";
import { DealsView } from "@/src/components/deals/deals-view";

export const metadata: Metadata = { title: "Deals" };

export default function DealsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <DealsView />
    </div>
  );
}
