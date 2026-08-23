"use client";

import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";
import { Activity, CircleCheck, LoaderCircle, ServerOff, Sparkles } from "lucide-react";
import { Badge } from "@amni/ui";
import { useDashboardSnapshot } from "@/src/hooks/use-dashboard-snapshot";
import { useMe } from "@/src/hooks/use-me";
import { ApiError } from "@/src/lib/api";

const Hero3D = dynamic(() => import("./hero-3d").then((module) => module.Hero3D), { ssr: false });

export function DashboardHero() {
  const reducedMotion = useReducedMotion();
  const me = useMe();
  const snapshot = useDashboardSnapshot();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const name = me.data ? [me.data.firstName, me.data.lastName].filter(Boolean).join(" ") : null;
  const erpOffline =
    snapshot.error instanceof ApiError && snapshot.error.code === "erp_unreachable";
  const status = erpOffline
    ? {
        label: "ERP needs attention",
        detail: "Business data is unavailable. Your settings remain accessible.",
        icon: ServerOff,
        variant: "destructive" as const,
      }
    : snapshot.isSuccess
      ? {
          label: "Data is up to date",
          detail: "Your workspace is connected and ready.",
          icon: CircleCheck,
          variant: "success" as const,
        }
      : {
          label: "Syncing workspace",
          detail: "Connecting to your business data.",
          icon: LoaderCircle,
        variant: "warning" as const,
      };
  const StatusIcon = status.icon;
  const isSyncing = !erpOffline && !snapshot.isSuccess;

  return (
    <section className="relative isolate min-h-72 overflow-hidden rounded-xl border border-primary/30 bg-[linear-gradient(135deg,var(--foreground),var(--primary))] text-primary-foreground shadow-lg shadow-primary/10">
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_65%_100%_at_75%_50%,color-mix(in_oklch,white_18%,transparent),transparent_72%)]"
        aria-hidden="true"
      />
      <div className="absolute -left-16 top-0 h-px w-2/5 bg-primary-foreground/60" aria-hidden="true" />
      <div className="absolute right-0 top-0 hidden h-full w-[48%] lg:block" aria-hidden="true">
        <Hero3D />
      </div>

      <div className="relative flex min-h-72 flex-col justify-between gap-8 p-6 sm:p-8 lg:max-w-[68%]">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: "easeOut" }}
          className="max-w-2xl"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-primary-foreground/70">
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground shadow-sm">
              <Activity className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span>Business pulse</span>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-[2.7rem]">
            {greeting}
            {name ? `, ${name}` : ""}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-primary-foreground/75 sm:text-base">
            A live command view for the decisions that move your company forward.
          </p>
        </motion.div>

        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, delay: reducedMotion ? 0 : 0.08, ease: "easeOut" }}
          className="flex w-fit items-center gap-3 rounded-xl border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-2.5 shadow-sm backdrop-blur-sm"
        >
          <Badge variant={status.variant} className="shrink-0 rounded-full p-1.5" aria-hidden="true">
            <StatusIcon className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin motion-reduce:animate-none" : ""}`} />
          </Badge>
          <div role="status" aria-live="polite">
            <p className="text-sm font-semibold text-primary-foreground">{status.label}</p>
            <p className="mt-0.5 text-xs leading-5 text-primary-foreground/70">{status.detail}</p>
          </div>
          <Sparkles className="ml-1 h-4 w-4 text-primary-foreground" aria-hidden="true" />
        </motion.div>
      </div>
    </section>
  );
}
