import type { Metadata } from "next";
import { CustomersListView } from "@/src/components/sales/customers-list-view";

export const metadata: Metadata = { title: "Customers · Sales" };

export default function CustomersPage() {
  return <CustomersListView />;
}
