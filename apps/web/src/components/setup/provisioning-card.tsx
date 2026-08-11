"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import type { ProvisioningStatus } from "@amni/shared";
import { Card, CardContent, Progress } from "@amni/ui";
import { provisioningClient } from "@/src/lib/wizard";

const STEP_LABELS: Record<string, string> = {
  preflight: "Checking site availability",
  create_site: "Creating your ERP site",
  configure: "Configuring your company",
  service_account: "Connecting the service account",
  tenant_admins: "Inviting your team",
  validate: "Validating the workspace",
  activate: "Activating your workspace",
};

export function ProvisioningCard() {
  const router = useRouter();
  const [status, setStatus] = React.useState<ProvisioningStatus | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const next = await provisioningClient.status();
        if (cancelled) return;
        setStatus(next);
        if (next.tenantStatus === "ACTIVE") {
          window.setTimeout(() => router.push("/dashboard"), 600);
        }
      } catch {
        if (!cancelled) setError("Provisioning status is temporarily unavailable. Retrying…");
      }
    };
    void poll();
    const timer = window.setInterval(poll, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [router]);

  const steps = status?.steps ?? [];
  const done = steps.filter((step) => step.status === "done").length;
  const runningKey = steps.find((step) => step.status === "running" || step.status === "failed")?.key;
  const percent = steps.length ? Math.round((done / steps.length) * 100) : 10;

  return (
    <Card className="w-full max-w-md">
      <CardContent className="space-y-5 pt-6">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
          <h1 className="text-xl font-semibold">Provisioning your workspace</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          This usually takes a minute or two. We&apos;ll drop you into your dashboard when it&apos;s ready.
        </p>
        <Progress value={percent} aria-label={`Provisioning progress ${percent}%`} />
        <ol className="space-y-2 text-sm">
          {steps.map((step) => (
            <li key={step.key} className="flex items-center gap-2">
              {step.status === "done" ? (
                <Check className="h-4 w-4 text-emerald-500" aria-hidden="true" />
              ) : step.key === runningKey ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
              ) : (
                <span className="h-4 w-4 rounded-full border border-muted-foreground/30" aria-hidden="true" />
              )}
              <span className={step.status === "done" ? "text-muted-foreground" : ""}>
                {STEP_LABELS[step.key] ?? step.key}
              </span>
            </li>
          ))}
        </ol>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
