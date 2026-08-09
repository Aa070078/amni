import type { Metadata } from "next";
import { RecurringDetailView } from "@/src/components/invoicing/recurring-detail";

export const metadata: Metadata = { title: "Recurring profile" };

interface Props {
  params: Promise<{ code: string }>;
}

export default async function RecurringDetailPage({ params }: Props) {
  const { code } = await params;
  return (
    <div className="mx-auto w-full max-w-5xl">
      <RecurringDetailView code={code} />
    </div>
  );
}
