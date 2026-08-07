import type { Metadata } from "next";
import { CustomerDetailView } from "@/src/components/sales/customer-detail-view";

export const metadata: Metadata = { title: "Customer · Sales" };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CustomerDetailView id={id} />;
}
