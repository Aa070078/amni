"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Activity as ActivityIcon, History } from "lucide-react";
import { Card, CardContent, Skeleton } from "@amni/ui";
import type { ActivityItem, DashboardActivity } from "@amni/shared";
import { api } from "@/src/lib/api";
import { formatRelativeTime } from "@/src/lib/format";
import { PanelEmpty, PanelError, PanelHeader } from "./panel-utils";

function ActivitySkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton key={index} className="h-10 rounded-md" />
      ))}
    </div>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const row = (
    <div className="flex gap-3">
      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-sm">
          <span className="font-medium">{item.action}</span>
          {item.target ? <span className="text-muted-foreground"> · {item.target}</span> : null}
        </p>
        <p className="text-xs text-muted-foreground">
          {item.actor ? <span>{item.actor} · </span> : null}
          {formatRelativeTime(item.time)}
        </p>
      </div>
    </div>
  );

  return item.href ? (
    <Link href={item.href} className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {row}
    </Link>
  ) : (
    row
  );
}

export function ActivityPanel() {
  const query = useQuery({
    queryKey: ["dashboard", "activity"],
    queryFn: () => api<DashboardActivity>("/dashboard/activity"),
  });
  const reducedMotion = useReducedMotion();
  const listVariants: Variants = reducedMotion
    ? { hidden: {}, show: {} }
    : { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
  const itemVariants: Variants = reducedMotion
    ? { hidden: {}, show: {} }
    : {
        hidden: { opacity: 0, x: 8 },
        show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
      };

  return (
    <Card className="h-full">
      <PanelHeader icon={ActivityIcon} title="Recent activity" />
      <CardContent>
        {query.isLoading ? (
          <ActivitySkeleton />
        ) : query.isError ? (
          <PanelError onRetry={() => void query.refetch()} />
        ) : query.data ? (
          query.data.activity.length === 0 ? (
            <PanelEmpty
              icon={History}
              title="No activity yet"
              description="Actions your team takes will show up here."
            />
          ) : (
            <motion.ul variants={listVariants} initial="hidden" animate="show" className="space-y-4">
              {query.data.activity.map((item) => (
                <motion.li key={item.id} variants={itemVariants}>
                  <ActivityRow item={item} />
                </motion.li>
              ))}
            </motion.ul>
          )
        ) : null}
      </CardContent>
    </Card>
  );
}
