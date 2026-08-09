import type { Metadata } from "next";
import { ProductsView } from "@/src/components/products/products-view";

export const metadata: Metadata = { title: "Products" };

export default function ProductsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <ProductsView />
    </div>
  );
}
