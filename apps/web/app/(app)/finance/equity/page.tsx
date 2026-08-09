import type { Metadata } from "next";
import { EquityView } from "@/src/components/equity/equity-view";

export const metadata: Metadata = { title: "Equity" };

export default function EquityPage() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <EquityView />
    </div>
  );
}
