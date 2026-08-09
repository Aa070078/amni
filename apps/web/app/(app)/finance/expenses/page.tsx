import type { Metadata } from "next";
import { ExpensesView } from "@/src/components/expenses/expenses-view";

export const metadata: Metadata = { title: "Expenses" };

export default function ExpensesPage() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <ExpensesView />
    </div>
  );
}
