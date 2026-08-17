"use client";

import { useQuery } from "@tanstack/react-query";
import type { DashboardSnapshot } from "@amni/shared";

import { api } from "@/src/lib/api";

export function useDashboardSnapshot() {
  return useQuery({
    queryKey: ["dashboard", "snapshot"],
    queryFn: () => api<DashboardSnapshot>("/dashboard/snapshot"),
    retry: false,
    staleTime: 15_000,
  });
}
