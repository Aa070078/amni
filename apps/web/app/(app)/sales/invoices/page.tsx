import type { Metadata } from "next";
import { SalesInvoicesView } from "@/src/components/sales-invoices/sales-invoices-view";

export const metadata: Metadata = { title: "Sales invoices" };

export default function SalesInvoicesPage() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <SalesInvoicesView />
    </div>
  );
}
