import { BarChart3, Boxes, Handshake, Landmark, LockKeyhole, Workflow } from "lucide-react";
import { Badge, Card, CardContent } from "@amni/ui";

const features = [
  {
    icon: Landmark,
    title: "Finance without the fog",
    description:
      "Invoices, payments, expenses, and reporting stay connected to the same source of truth.",
  },
  {
    icon: Handshake,
    title: "Sales that flows forward",
    description:
      "Move from lead to quotation, order, invoice, and payment without re-entering the work.",
  },
  {
    icon: Boxes,
    title: "Inventory you can trust",
    description:
      "Know what is available, reserved, and moving across every warehouse in real time.",
  },
  {
    icon: BarChart3,
    title: "Decisions from live data",
    description:
      "See the numbers and exceptions that matter, with every dashboard tied to operational records.",
  },
  {
    icon: Workflow,
    title: "One operating system",
    description:
      "Purchasing, fulfillment, and accounting work together instead of living in disconnected tools.",
  },
  {
    icon: LockKeyhole,
    title: "Isolated by design",
    description:
      "Every company receives its own ERP site and credentials, with tenant access enforced on the server.",
  },
];

export function LandingFeatures() {
  return (
    <section id="product" className="mx-auto w-full max-w-6xl scroll-mt-24 px-6 py-24 sm:py-32">
      <div className="max-w-2xl">
        <Badge variant="secondary">One connected workspace</Badge>
        <h2 className="mt-5 text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">
          Every team sees the same business.
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
          Amni turns the depth of ERPNext into a focused product your team can actually use—without
          losing the controls, audit trail, or operational detail underneath.
        </p>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <Card
            key={feature.title}
            className="group border-border/70 transition duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
          >
            <CardContent className="p-6">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-105">
                <feature.icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-5 text-base font-semibold tracking-tight">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
