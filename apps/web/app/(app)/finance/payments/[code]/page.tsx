import type { Metadata } from "next";
import { PaymentDetailView } from "@/src/components/payments/payment-detail";

export const metadata: Metadata = { title: "Payment" };

export default async function PaymentDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <div className="mx-auto w-full max-w-7xl">
      <PaymentDetailView code={code} />
    </div>
  );
}
