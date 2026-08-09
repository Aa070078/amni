"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Boxes,
  CircleDollarSign,
  CreditCard,
  Package,
  Percent,
  Ruler,
  ShoppingCart,
  Tag,
  TriangleAlert,
  Truck,
  Wallet,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from "@amni/ui";
import { formatCurrency, formatPercent } from "@/src/lib/format";
import { productsClient, ProductsApiError } from "@/src/lib/products";
import { ProductStatusBadge } from "./product-status";

interface ProductDetailViewProps {
  code: string;
}

export function ProductDetailView({ code }: ProductDetailViewProps) {
  const detailQuery = useQuery({
    queryKey: ["products", "detail", code],
    queryFn: () => productsClient.detail(code),
    retry: (failureCount, error) => {
      if (error instanceof ProductsApiError && error.status === 404) return false;
      return failureCount < 2;
    },
  });

  if (detailQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-40 rounded-lg" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-lg lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (detailQuery.isError) {
    const is404 = detailQuery.error instanceof ProductsApiError && detailQuery.error.status === 404;
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
          <Boxes className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-base font-semibold">
              {is404 ? "Product not found" : "Couldn&apos;t load this product"}
            </p>
            <p className="text-sm text-muted-foreground">
              {is404
                ? `No product matches ${code}. It may have been removed.`
                : "Something went wrong. Please try again."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!is404 ? (
              <Button variant="outline" onClick={() => void detailQuery.refetch()}>
                Retry
              </Button>
            ) : null}
            <Button asChild variant={is404 ? "default" : "outline"}>
              <Link href="/inventory/products">
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Back to products
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const product = detailQuery.data;
  if (!product) return null;

  return (
    <div className="space-y-6">
      <Link
        href="/inventory/products"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Products
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{product.name}</h1>
              <span className="text-sm tabular-nums text-muted-foreground">{product.code}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">SKU · {product.sku}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <ProductStatusBadge status={product.status} />
              <Badge variant="secondary">{product.category}</Badge>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-1 sm:items-end">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold tabular-nums tracking-tight">
                {formatCurrency(product.price, product.currency)}
              </span>
              <span className="text-sm text-muted-foreground">/ {product.unit}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              Cost {formatCurrency(product.cost, product.currency)} · {formatPercent(product.vatRate)} VAT
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
              <CardDescription>Key information about this product.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <DetailRow icon={Tag} label="Category" value={product.category} />
              <DetailRow icon={Ruler} label="Unit" value={product.unit} />
              <DetailRow icon={CircleDollarSign} label="Price" value={formatCurrency(product.price, product.currency)} />
              <DetailRow icon={Wallet} label="Cost" value={formatCurrency(product.cost, product.currency)} />
              <DetailRow icon={Boxes} label="Currency" value={product.currency} />
              <DetailRow icon={Percent} label="VAT rate" value={formatPercent(product.vatRate)} />
              <DetailRow
                icon={TriangleAlert}
                label="Reorder level"
                value={product.reorderLevel > 0 ? `${product.reorderLevel} ${product.unit}` : "Not set"}
              />
              <DetailRow icon={Package} label="Stock item" value={product.isStockItem ? "Yes" : "No"} />
              <DetailRow icon={ShoppingCart} label="Sales item" value={product.isSalesItem ? "Yes" : "No"} />
              <DetailRow icon={Truck} label="Purchase item" value={product.isPurchaseItem ? "Yes" : "No"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {product.description || "No description yet for this product."}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Tag;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="truncate text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
}
