"use client";

import { useState, type DragEvent } from "react";
import Link from "next/link";
import { Boxes, Package } from "lucide-react";
import type { Product } from "@amni/shared";
import { Badge, Card, CardContent, cn } from "@amni/ui";
import { formatCurrency } from "@/src/lib/format";
import { PRODUCT_CATEGORIES, ProductStatusBadge } from "./product-status";

interface ProductsBoardProps {
  products: Product[];
  onCategoryChange?: (code: string, category: string) => void;
}

export function ProductsBoard({ products, onCategoryChange }: ProductsBoardProps) {
  const [dragCode, setDragCode] = useState<string | null>(null);
  const [overCategory, setOverCategory] = useState<string | null>(null);

  const categories = PRODUCT_CATEGORIES;

  function handleDrop(category: string, event: DragEvent<HTMLElement>) {
    event.preventDefault();
    const code = dragCode ?? event.dataTransfer.getData("text/plain");
    setDragCode(null);
    setOverCategory(null);
    if (code && onCategoryChange) {
      onCategoryChange(code, category);
    }
  }

  return (
    <div
      className="flex gap-4 overflow-x-auto pb-4 pt-1"
      role="region"
      aria-label="Products category board"
    >
      {categories.map((cat) => {
        const catProducts = products.filter((p) => p.category === cat);
        const catValue = catProducts.reduce((sum, p) => sum + p.price, 0);

        return (
          <section
            key={cat}
            aria-label={`${cat} category column`}
            onDragOver={(event) => {
              event.preventDefault();
              setOverCategory(cat);
            }}
            onDragLeave={() => setOverCategory((current) => (current === cat ? null : current))}
            onDrop={(event) => handleDrop(cat, event)}
            className={cn(
              "flex min-h-[380px] w-[285px] shrink-0 flex-col rounded-xl border bg-muted/20 p-2.5 transition-colors",
              overCategory === cat && "border-primary bg-muted/50 ring-1 ring-primary/20",
            )}
          >
            <header className="flex items-center justify-between gap-2 px-1.5 py-2">
              <div className="flex items-center gap-2">
                <Boxes className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <h3 className="text-sm font-semibold capitalize text-foreground">{cat}</h3>
                <span
                  className="rounded-full bg-muted-foreground/10 px-2 py-0.5 text-xs tabular-nums text-muted-foreground"
                  aria-label={`${catProducts.length} items`}
                >
                  {catProducts.length}
                </span>
              </div>
              <span className="text-xs font-medium tabular-nums text-muted-foreground">
                {formatCurrency(catValue, "USD")}
              </span>
            </header>

            <div className="flex flex-col gap-2.5">
              {catProducts.map((product) => (
                <Card
                  key={product.code}
                  draggable
                  onDragStart={(event) => {
                    setDragCode(product.code);
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", product.code);
                  }}
                  onDragEnd={() => {
                    setDragCode(null);
                    setOverCategory(null);
                  }}
                  className={cn(
                    "cursor-grab transition-all hover:border-primary/50 hover:shadow-sm active:cursor-grabbing",
                    dragCode === product.code && "opacity-50",
                  )}
                >
                  <CardContent className="flex flex-col gap-2 p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/inventory/products/${product.code}`}
                        className="font-semibold text-sm text-foreground hover:text-primary hover:underline line-clamp-1"
                      >
                        {product.name}
                      </Link>
                      <ProductStatusBadge status={product.status} />
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-mono">{product.code}</span>
                      <span className="font-medium text-foreground tabular-nums">
                        {formatCurrency(product.price, product.currency)} / {product.unit}
                      </span>
                    </div>

                    {product.description ? (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {product.description}
                      </p>
                    ) : null}

                    <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[11px] text-muted-foreground">
                      <span>SKU: {product.sku}</span>
                      {product.reorderLevel > 0 ? (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          Reorder: {product.reorderLevel}
                        </Badge>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {catProducts.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                  <Package className="mb-1 h-5 w-5 text-muted-foreground/50" />
                  <span>No products in {cat}</span>
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
