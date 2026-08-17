"use client";

import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import {
  ArrowRight,
  Check,
  CircleDollarSign,
  PackageCheck,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { Badge, Button, Card, CardContent } from "@amni/ui";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

const benefits = [
  "Your own isolated ERP",
  "Guided setup, no consultants",
  "One home for the whole operation",
];

function ProductPreview() {
  return (
    <motion.div variants={item} className="relative lg:pl-8">
      <div aria-hidden className="absolute -inset-8 -z-10 rounded-full bg-primary/10 blur-3xl" />
      <Card className="overflow-hidden border-border/70 bg-card/90 shadow-2xl shadow-primary/10 backdrop-blur">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Good morning, Amara</p>
            <p className="mt-0.5 font-semibold">Your business at a glance</p>
          </div>
          <Badge variant="secondary" className="gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
            Live data
          </Badge>
        </div>
        <CardContent className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border bg-background/70 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Revenue</span>
                <TrendingUp className="h-4 w-4 text-success" aria-hidden />
              </div>
              <p className="mt-2 text-xl font-semibold tracking-tight">$184,260</p>
              <p className="mt-1 text-xs font-medium text-success">↑ 12.4% this month</p>
            </div>
            <div className="rounded-lg border bg-background/70 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Cash position</span>
                <CircleDollarSign className="h-4 w-4 text-primary" aria-hidden />
              </div>
              <p className="mt-2 text-xl font-semibold tracking-tight">$72,940</p>
              <p className="mt-1 text-xs text-muted-foreground">Across 3 accounts</p>
            </div>
          </div>

          <div className="rounded-lg border bg-background/70 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Revenue trend</p>
                <p className="text-xs text-muted-foreground">Last six months</p>
              </div>
              <Badge variant="outline">USD</Badge>
            </div>
            <div
              className="mt-5 flex h-24 items-end gap-2"
              aria-label="Revenue grows steadily over six months"
            >
              {[38, 52, 45, 68, 76, 92].map((height, index) => (
                <div key={height} className="flex h-full flex-1 items-end">
                  <motion.span
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ delay: 0.55 + index * 0.06, duration: 0.5, ease: "easeOut" }}
                    className="w-full rounded-t-sm bg-primary/80"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-success/20 bg-success/5 p-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
              <PackageCheck className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">Inventory is healthy</p>
              <p className="truncate text-xs text-muted-foreground">
                2 items need attention across 3 warehouses
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function LandingHero() {
  const reduce = useReducedMotion();

  return (
    <section className="relative overflow-hidden border-b">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[720px] bg-[radial-gradient(ellipse_70%_60%_at_55%_-10%,color-mix(in_oklch,var(--primary)_16%,transparent),transparent_70%)]" />
        <div
          className="absolute inset-0 opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent_88%)]"
          style={{
            backgroundImage:
              "linear-gradient(to right, color-mix(in oklch, var(--border) 70%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklch, var(--border) 70%, transparent) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      <motion.div
        variants={container}
        initial={reduce ? false : "hidden"}
        animate="show"
        className="relative mx-auto grid w-full max-w-6xl items-center gap-14 px-6 py-20 sm:py-28 lg:grid-cols-[1.02fr_0.98fr] lg:py-32"
      >
        <div>
          <motion.div variants={item}>
            <Badge variant="outline" className="gap-2 bg-background/70 px-3 py-1.5 backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden />A private ERP, ready
              for your business
            </Badge>
          </motion.div>

          <motion.h1
            variants={item}
            className="mt-7 max-w-2xl text-4xl font-bold tracking-[-0.04em] sm:text-6xl lg:text-7xl"
          >
            Run the business.
            <span className="block bg-gradient-to-r from-primary to-primary/55 bg-clip-text text-transparent">
              Skip the ERP project.
            </span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl"
          >
            Amni gives your team one calm, modern workspace for finance, sales, purchasing, and
            inventory—powered by a fully isolated ERPNext instance.
          </motion.p>

          <motion.div variants={item} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="group">
              <Link href="/signup">
                Start your workspace
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#how-it-works">See how it works</Link>
            </Button>
          </motion.div>

          <motion.ul
            variants={item}
            className="mt-8 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2"
          >
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Check className="h-3 w-3" aria-hidden />
                </span>
                {benefit}
              </li>
            ))}
          </motion.ul>
        </div>

        <ProductPreview />
      </motion.div>
    </section>
  );
}
