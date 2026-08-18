import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, FileText, PackageCheck, Receipt, Target, UserRound, Users, type LucideIcon } from "lucide-react";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@amni/ui";

export const metadata: Metadata = { title: "Sales" };

const SALES_WORKFLOWS: Array<{
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}> = [
  { title: "Deals", description: "Move qualified opportunities from forecast to close.", href: "/sales/deals", icon: Target },
  { title: "Leads", description: "Qualify new demand and turn it into active opportunities.", href: "/sales/leads", icon: Users },
  { title: "Customers", description: "Manage customer accounts, contacts, and outstanding balances.", href: "/sales/customers", icon: UserRound },
  { title: "Quotations", description: "Prepare accurate quotes and convert accepted work into orders.", href: "/sales/quotations", icon: FileText },
  { title: "Sales orders", description: "Track confirmed demand, delivery dates, and fulfilment.", href: "/sales/orders", icon: PackageCheck },
  { title: "Sales invoices", description: "Bill customers, follow payment status, and close the loop.", href: "/sales/invoices", icon: Receipt },
];

export default function SalesPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Revenue operations</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Sales</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Run the complete quote-to-cash flow from one focused workspace.
          </p>
        </div>
        <Badge variant="secondary" className="w-fit">6 connected workflows</Badge>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SALES_WORKFLOWS.map(({ title, description, href, icon: Icon }) => (
          <Link key={href} href={href} className="group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <Card className="h-full transition-colors group-hover:border-primary/40 group-hover:bg-accent/30">
              <CardHeader className="pb-3">
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary motion-reduce:transform-none" aria-hidden="true" />
                </div>
                <CardTitle className="text-base">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="leading-6">{description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
