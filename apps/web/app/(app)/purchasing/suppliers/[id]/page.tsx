import type { Metadata } from "next";
import { SupplierDetailView } from "@/src/components/purchasing/supplier-detail-view";

export const metadata: Metadata = { title: "Supplier · Purchasing" };

export default async function SupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SupplierDetailView id={id} />;
}
