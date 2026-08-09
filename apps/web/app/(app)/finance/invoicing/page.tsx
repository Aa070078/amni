import type { Metadata } from "next";
import { InvoicingView } from "@/src/components/invoicing/invoicing-view";

export const metadata: Metadata = { title: "Invoicing" };

export default function InvoicingPage() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <InvoicingView />
    </div>
  );
}
