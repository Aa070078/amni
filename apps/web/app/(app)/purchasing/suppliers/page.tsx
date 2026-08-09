import type { Metadata } from "next";
import { SuppliersView } from "@/src/components/suppliers/suppliers-view";

export const metadata: Metadata = { title: "Suppliers" };

export default function SuppliersPage() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <SuppliersView />
    </div>
  );
}
