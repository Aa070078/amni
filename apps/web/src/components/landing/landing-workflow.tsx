import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, SlidersHorizontal } from "lucide-react";
import { Badge, Button, Card, CardContent } from "@amni/ui";

const steps = [
  {
    number: "01",
    icon: Building2,
    title: "Tell us how you operate",
    description: "Answer a short guided setup about your company, currency, teams, and workflows.",
  },
  {
    number: "02",
    icon: SlidersHorizontal,
    title: "Amni provisions your ERP",
    description:
      "We create and configure an isolated ERPNext site with the right foundation for your business.",
  },
  {
    number: "03",
    icon: CheckCircle2,
    title: "Invite the team and go",
    description:
      "Start with a focused workspace while Amni keeps the operational system behind it connected.",
  },
];

export function LandingWorkflow() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-y bg-muted/30">
      <div className="mx-auto w-full max-w-6xl px-6 py-24 sm:py-32">
        <div className="text-center">
          <Badge variant="outline" className="bg-background">
            From signup to operating system
          </Badge>
          <h2 className="mx-auto mt-5 max-w-3xl text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">
            The ERP rollout that doesn’t become a project.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            A guided path replaces weeks of infrastructure, configuration, and consultant-led setup.
          </p>
        </div>

        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {steps.map((step) => (
            <Card key={step.number} className="relative overflow-hidden bg-background">
              <span
                className="absolute right-4 top-2 text-6xl font-bold tracking-tighter text-muted/70"
                aria-hidden
              >
                {step.number}
              </span>
              <CardContent className="relative p-7">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
                  <step.icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-8 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-16 overflow-hidden rounded-2xl border bg-card p-8 shadow-sm sm:p-12">
          <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-primary">Ready when your team is</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                Build the calm center of your business.
              </h2>
              <p className="mt-3 text-muted-foreground">
                Start your workspace and turn disconnected operations into one reliable flow.
              </p>
            </div>
            <Button asChild size="lg" className="group shrink-0">
              <Link href="/signup">
                Get started
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
