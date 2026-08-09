import type { Metadata } from "next";
import { WarehousesView } from "@/src/components/warehouses/warehouses-view";

export const metadata: Metadata = { title: "Warehouses" };

export default function WarehousesPage() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <WarehousesView />
    </div>
  );
}
