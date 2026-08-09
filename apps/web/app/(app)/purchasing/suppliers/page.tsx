import type { Metadata } from "next";
import { SuppliersListView } from "@/src/components/purchasing/suppliers-list-view";

export const metadata: Metadata = { title: "Suppliers · Purchasing" };

export default function SuppliersPage() {
  return <SuppliersListView />;
}
