import type { Metadata } from "next";
import { CustomerDetailView } from "@/src/components/customers/customer-detail";

export const metadata: Metadata = { title: "Customer" };

export default async function CustomerDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <div className="mx-auto w-full max-w-7xl">
      <CustomerDetailView code={decodeURIComponent(code)} />
    </div>
  );
}
