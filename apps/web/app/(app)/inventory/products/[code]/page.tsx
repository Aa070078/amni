import type { Metadata } from "next";
import { ProductDetailView } from "@/src/components/products/product-detail-view";

export const metadata: Metadata = { title: "Product detail" };

export default async function ProductDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <div className="mx-auto w-full max-w-7xl">
      <ProductDetailView code={decodeURIComponent(code)} />
    </div>
  );
}
