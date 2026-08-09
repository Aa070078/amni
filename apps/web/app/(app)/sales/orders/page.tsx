import type { Metadata } from "next";
import { SalesOrdersView } from "@/src/components/sales-orders/sales-orders-view";

export const metadata: Metadata = { title: "Sales orders" };

export default function SalesOrdersPage() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <SalesOrdersView />
    </div>
  );
}
