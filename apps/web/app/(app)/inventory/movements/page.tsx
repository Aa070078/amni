import type { Metadata } from "next";
import { StockMovementsView } from "@/src/components/stock-movements/stock-movements-view";

export const metadata: Metadata = { title: "Stock movements" };

export default function StockMovementsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <StockMovementsView />
    </div>
  );
}
