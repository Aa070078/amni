import { LineChart, Package, Wallet } from "lucide-react";
import { Card, CardContent } from "@amni/ui";

const features = [
  {
    icon: Wallet,
    title: "Accounting & finance",
    description: "Invoices, payments, expenses and equity — with an audit trail you control.",
  },
  {
    icon: LineChart,
    title: "Sales & CRM",
    description: "Leads, pipelines, quotations and orders — managed as a visual board.",
  },
  {
    icon: Package,
    title: "Inventory & purchasing",
    description: "Products, stock movements, warehouses and purchase orders in one place.",
  },
];

export function LandingFeatures() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 pb-24">
      <div className="grid gap-4 sm:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.title} className="group transition-shadow hover:shadow-md">
            <CardContent className="flex flex-col gap-3 p-6">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary">
                <feature.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="text-base font-semibold tracking-tight">{feature.title}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
