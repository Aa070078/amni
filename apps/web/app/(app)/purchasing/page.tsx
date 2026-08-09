import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ClipboardList, ReceiptText, Store } from "lucide-react";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@amni/ui";

export const metadata: Metadata = { title: "Purchasing" };

const LIVE = [
  {
    title: "Suppliers",
    description: "Manage the vendors you buy from.",
    href: "/purchasing/suppliers",
    icon: Store,
  },
  {
    title: "Purchase orders",
    description: "Order stock and services from suppliers.",
    href: "/purchasing/purchase-orders",
    icon: ClipboardList,
  },
  {
    title: "Purchase invoices",
    description: "Track supplier bills and what's owed.",
    href: "/purchasing/purchase-invoices",
    icon: ReceiptText,
  },
];

export default function PurchasingPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Purchasing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Suppliers, purchase orders and purchase invoices.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {LIVE.map(({ title, description, href, icon: Icon }) => (
          <Link key={href} href={href} className="group">
            <Card className="h-full transition-colors hover:border-primary/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  {title}
                  <Badge variant="secondary">Live</Badge>
                </CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
                View list
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
