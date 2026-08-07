import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileText, Handshake, Users } from "lucide-react";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@amni/ui";

export const metadata: Metadata = { title: "Sales" };

const COMING_SOON = [
  { title: "Quotes", description: "Draft, send and track customer quotes." },
  { title: "Orders", description: "Convert quotes into sales orders and invoices." },
];

export default function SalesPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sales</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Customers, quotes and orders.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/sales/customers" className="group">
          <Card className="h-full transition-colors hover:border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Customers
                <Badge variant="secondary">Live</Badge>
              </CardTitle>
              <CardDescription>Manage the companies and people you sell to.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
              View customer list
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </CardContent>
          </Card>
        </Link>
        {COMING_SOON.map((module) => (
          <Card key={module.title} className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                {module.title === "Quotes" ? (
                  <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                ) : (
                  <Handshake className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                )}
                {module.title}
                <Badge variant="secondary">Coming soon</Badge>
              </CardTitle>
              <CardDescription>{module.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
