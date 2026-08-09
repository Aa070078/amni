import type { Metadata } from "next";
import { CustomersView } from "@/src/components/customers/customers-view";

export const metadata: Metadata = { title: "Customers" };

export default function CustomersPage() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <CustomersView />
    </div>
  );
}
