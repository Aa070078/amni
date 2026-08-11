import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileText, PackageCheck, Receipt, Target, UserRound, Users } from "lucide-react";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@amni/ui";

export const metadata: Metadata = { title: "Sales" };

export default function SalesPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sales</h1>
        <p className="mt-1 text-sm text-muted-foreground">Deals, leads, customers, quotations, orders, invoices</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Deals
            <Badge variant="success">Live</Badge>
          </CardTitle>
          <CardDescription>
            Qualified opportunities with expected value and close dates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/sales/deals"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Open deals
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </CardContent>
      </Card>

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
            <UserRound className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Customers
            <Badge variant="success">Live</Badge>
          </CardTitle>
          <CardDescription>
            Manage the people and companies you sell to and track what they owe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/sales/customers"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Open customers
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Quotations
            <Badge variant="success">Live</Badge>
          </CardTitle>
          <CardDescription>
            Send quotes and turn them into sales orders.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/sales/quotations"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Open quotations
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PackageCheck className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Sales orders
            <Badge variant="success">Live</Badge>
          </CardTitle>
          <CardDescription>
            Raise orders, track delivery dates, and manage fulfilment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/sales/orders"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Open orders
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Sales invoices
            <Badge variant="success">Live</Badge>
          </CardTitle>
          <CardDescription>
            Bill customers and record payments against them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/sales/invoices"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Open sales invoices
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
