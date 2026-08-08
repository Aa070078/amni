import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Handshake, Users } from "lucide-react";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@amni/ui";

export const metadata: Metadata = { title: "Sales" };

export default function SalesPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sales</h1>
        <p className="mt-1 text-sm text-muted-foreground">Customers, quotes, orders</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Leads
            <Badge variant="success">Live</Badge>
          </CardTitle>
          <CardDescription>
            Track and move opportunities through your sales pipeline.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/sales/leads"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Open leads
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Handshake className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Customers &amp; orders
            <Badge variant="secondary">Coming soon</Badge>
          </CardTitle>
          <CardDescription>Quotes and orders ship in a later milestone.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
