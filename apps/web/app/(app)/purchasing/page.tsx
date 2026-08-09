import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Receipt, ShoppingCart, Users } from "lucide-react";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@amni/ui";

export const metadata: Metadata = { title: "Purchasing" };

export default function PurchasingPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Purchasing</h1>
        <p className="mt-1 text-sm text-muted-foreground">Suppliers, purchase orders, purchase invoices</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Suppliers
            <Badge variant="success">Live</Badge>
          </CardTitle>
          <CardDescription>
            Manage the vendors you buy from and track what&apos;s outstanding.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/purchasing/suppliers"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Open suppliers
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingCart className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Purchase orders
            <Badge variant="success">Live</Badge>
          </CardTitle>
          <CardDescription>
            Order from suppliers and track expected deliveries.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/purchasing/orders"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Open purchase orders
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Purchase invoices
            <Badge variant="success">Live</Badge>
          </CardTitle>
          <CardDescription>
            Track bills from suppliers and record payments against them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/purchasing/invoices"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Open purchase invoices
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
