import type { Metadata } from "next";
import { ExpenseClaimsView } from "@/src/components/expenses/expense-claims-view";

export const metadata: Metadata = { title: "Claims & Categories" };

export default function ExpenseClaimsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <ExpenseClaimsView />
    </div>
  );
}
