import type { Metadata } from "next";
import { AccountDetailView } from "@/src/components/accounting/account-detail";

export const metadata: Metadata = { title: "Account" };

interface Props {
  params: Promise<{ code: string }>;
}

export default async function AccountDetailPage({ params }: Props) {
  const { code } = await params;
  return (
    <div className="mx-auto w-full max-w-5xl">
      <AccountDetailView code={decodeURIComponent(code)} />
    </div>
  );
}
