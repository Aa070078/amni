"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useMe } from "@/src/hooks/use-me";
import { provisioningClient } from "@/src/lib/wizard";

const SETUP_STATUSES = new Set(["CREATING", "PROVISIONING", "FAILED"]);

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

  return children;
}
