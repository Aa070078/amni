import type { Metadata } from "next";
import { PaymentsView } from "@/src/components/payments/payments-view";

export const metadata: Metadata = { title: "Payments" };

export default function PaymentsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <PaymentsView />
    </div>
  );
}
