import type { Metadata } from "next";
import { FinanceOverviewView } from "@/src/components/finance/finance-overview";

export const metadata: Metadata = { title: "Finance" };

export default function FinancePage() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <FinanceOverviewView />
    </div>
  );
}
