import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftRight, ArrowRight, Boxes, Warehouse } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@amni/ui";

export const metadata: Metadata = { title: "Inventory" };

const MODULES = [
  {
    href: "/inventory/products",
    icon: Boxes,
    title: "Products",
    description: "Manage your product catalog — prices, categories, SKUs, VAT rates, and reorder levels.",
    metric: "18 products",
    metricHint: "across all categories",
    cta: "Open products",
  },
  {
    href: "/inventory/warehouses",
    icon: Warehouse,
    title: "Warehouses",
    description: "Track your storage locations, on-hand quantities, reserved stock, and low-stock alerts.",
    metric: "6 warehouses",
    metricHint: "locations active",
    cta: "Open warehouses",
  },
  {
    href: "/inventory/movements",
    icon: ArrowLeftRight,
    title: "Stock movements",
    description: "Record and review inbound receipts, outbound shipments, transfers, and adjustments.",
    metric: "16 movements",
    metricHint: "recorded so far",
    cta: "Open movements",
  },
] as const;

export default function InventoryPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Products, warehouses, and stock movements — all in one place.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map(({ href, icon: Icon, title, description, metric, metricHint, cta }) => (
          <Card key={href} className="flex flex-col transition-shadow hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-muted/50">
                  <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <Badge variant="success" className="mt-0.5">
                  Live
                </Badge>
              </div>
              <CardTitle className="mt-3 text-base">{title}</CardTitle>
              <CardDescription className="text-sm leading-relaxed">{description}</CardDescription>
            </CardHeader>

            <CardContent className="flex-1 pb-3">
              <div className="rounded-md bg-muted/40 px-3 py-2.5">
                <p className="text-lg font-semibold tabular-nums tracking-tight text-foreground">{metric}</p>
                <p className="text-xs text-muted-foreground">{metricHint}</p>
              </div>
            </CardContent>

            <CardFooter className="pt-0">
              <Button asChild variant="outline" size="sm" className="w-full gap-2">
                <Link href={href}>
                  {cta}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
