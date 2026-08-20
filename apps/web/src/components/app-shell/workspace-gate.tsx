"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Loader2, ServerOff, TriangleAlert } from "lucide-react";
import { useMe } from "@/src/hooks/use-me";
import { provisioningClient } from "@/src/lib/wizard";
import { api } from "@/src/lib/api";

const SETUP_STATUSES = new Set(["CREATING", "PROVISIONING", "FAILED"]);
interface TenantHealth { status: "healthy" | "degraded" | "unreachable" | "unknown"; checkedAt: string; latencyMs?: number }

export function WorkspaceGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const me = useMe();
  const provisioning = useQuery({
    queryKey: ["provisioning", "status"],
    queryFn: provisioningClient.status,
    enabled: Boolean(me.data && !me.data.isPlatformAdmin),
    retry: 1,
    staleTime: 5_000,
  });
  const needsSetup = Boolean(
    !me.data?.isPlatformAdmin &&
      provisioning.data &&
      SETUP_STATUSES.has(provisioning.data.tenantStatus),
  );
  const health = useQuery({
    queryKey: ["tenant", "health"],
    queryFn: () => api<TenantHealth>("/healthz/tenant"),
    enabled: Boolean(me.data && !me.data.isPlatformAdmin && provisioning.data?.tenantStatus === "ACTIVE"),
    retry: 1,
    refetchInterval: 60_000,
  });

  React.useEffect(() => {
    if (needsSetup) router.replace("/setup");
  }, [needsSetup, router]);

  if (me.isLoading || (me.data && !me.data.isPlatformAdmin && provisioning.isLoading) || needsSetup) {
    return (
      <div className="flex min-h-[55vh] flex-col items-center justify-center gap-3 text-center" aria-live="polite">
        <Loader2 className="h-6 w-6 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
        <p className="text-sm font-medium">Preparing your workspace</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          We’re taking you to setup so you can see progress or restart any failed step.
        </p>
      </div>
    );
  }

  const unhealthy = health.data?.status === "unreachable" || health.data?.status === "degraded";
  const HealthIcon = health.data?.status === "unreachable" ? ServerOff : TriangleAlert;
  return (
    <>
      {unhealthy ? (
        <div className="mb-5 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm" role="status">
          <HealthIcon className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
          <div>
            <p className="font-medium">{health.data?.status === "unreachable" ? "Business data is temporarily offline" : "Business data is responding slowly"}</p>
            <p className="mt-0.5 text-muted-foreground">{health.data?.status === "unreachable" ? "Amni is monitoring the ERP connection. You can still use account settings while recovery is in progress." : "Pages may take longer to load. Amni is actively monitoring this workspace."}</p>
          </div>
        </div>
      ) : null}
      {children}
    </>
  );
}
