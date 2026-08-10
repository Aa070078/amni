"use client";

import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@amni/ui";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

export function LandingHero() {
  const reduce = useReducedMotion();

  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(ellipse_70%_60%_at_50%_-10%,color-mix(in_oklch,var(--primary)_14%,transparent),transparent_70%)]" />
        <div
          className="absolute inset-x-0 top-0 h-[560px] opacity-50 [mask-image:linear-gradient(to_bottom,black,transparent_80%)]"
          style={{
            backgroundImage:
              "linear-gradient(to right, color-mix(in oklch, var(--border) 70%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklch, var(--border) 70%, transparent) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
      </div>

      <motion.div
        variants={container}
        initial={reduce ? false : "hidden"}
        animate="show"
        className="relative mx-auto flex w-full max-w-3xl flex-col items-center px-6 pb-24 pt-24 text-center sm:pt-32"
      >
        <motion.div variants={item}>
          <span className="inline-flex items-center gap-2 rounded-full border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            Isolated, multi-tenant ERP — provisioned for you
          </span>
        </motion.div>

        <motion.h1
          variants={item}
          className="mt-7 text-4xl font-bold tracking-tight sm:text-6xl"
        >
          ERP, set up in{" "}
          <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            minutes
          </span>
        </motion.h1>

        <motion.p variants={item} className="mt-5 max-w-xl text-lg text-muted-foreground">
          Amni provisions a full-featured, isolated ERP for your company — accounting, sales,
          inventory and purchasing — so you can run the business, not the software.
        </motion.p>

        <motion.div variants={item} className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/signup">Start free</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link href="/signup">
              See how it works
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </motion.div>

        <motion.p
          variants={item}
          className="mt-14 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground/80"
        >
          Accounting · Sales &amp; CRM · Inventory · Purchasing
        </motion.p>
      </motion.div>
    </section>
  );
}
