import type { Metadata } from "next";
import { AccountingView } from "@/src/components/accounting/accounting-view";

export const metadata: Metadata = { title: "Accounting" };

export default function AccountingPage() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <AccountingView />
    </div>
  );
}
