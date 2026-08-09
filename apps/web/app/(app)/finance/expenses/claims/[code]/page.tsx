import type { Metadata } from "next";
import { ExpenseClaimDetailView } from "@/src/components/expenses/expense-claim-detail";

export const metadata: Metadata = { title: "Expense Claim" };

export default async function ExpenseClaimDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <div className="mx-auto w-full max-w-7xl">
      <ExpenseClaimDetailView code={code} />
    </div>
  );
}
