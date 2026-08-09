import type { Metadata } from "next";
import { ExpenseDetailView } from "@/src/components/expenses/expense-detail";

export const metadata: Metadata = { title: "Expense" };

export default async function ExpenseDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <div className="mx-auto w-full max-w-7xl">
      <ExpenseDetailView code={code} />
    </div>
  );
}
