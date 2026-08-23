"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Loader2, RotateCcw } from "lucide-react";
import type { ProvisioningStatus } from "@amni/shared";
import { Button, Card, CardContent, Progress } from "@amni/ui";
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
  const [retrying, setRetrying] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const next = await provisioningClient.status();
        if (cancelled) return;
        setStatus(next);
        setError(null);
        if (next.tenantStatus === "ACTIVE") {
          window.setTimeout(() => router.push("/dashboard"), 600);
        }
      } catch {
        if (!cancelled) setError("Provisioning status is temporarily unavailable. Retrying…");
      }
    };
    void poll();
    const timer = window.setInterval(() => {
      if (status?.tenantStatus !== "FAILED" && status?.tenantStatus !== "ACTIVE") void poll();
    }, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [router, status?.tenantStatus]);

  const steps = status?.steps ?? [];
  const done = steps.filter((step) => step.status === "done").length;
  const runningKey = steps.find((step) => step.status === "running" || step.status === "failed")?.key;
  const percent = steps.length ? Math.round((done / steps.length) * 100) : 10;
  const failed = status?.tenantStatus === "FAILED";

  const retry = async () => {
    setRetrying(true);
    setError(null);
    try {
      await provisioningClient.retry();
      setStatus(await provisioningClient.status());
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : "Could not restart provisioning.");
    } finally {
      setRetrying(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardContent className="space-y-5 pt-6">
        <div className="flex items-center gap-3">
          {failed ? (
            <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
          ) : (
            <Loader2 className="h-5 w-5 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
          )}
          <h1 className="text-xl font-semibold">
            {failed ? "Workspace setup needs attention" : "Provisioning your workspace"}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {failed
            ? "Setup stopped before your workspace was ready. Your account is safe, and you can restart from the failed step."
            : "This usually takes a minute or two. We’ll take you to your dashboard when it’s ready."}
        </p>
        <Progress value={percent} aria-label={`Provisioning progress ${percent}%`} />
        <ol className="space-y-2 text-sm">
          {steps.map((step) => (
            <li key={step.key} className="flex items-center gap-2">
              {step.status === "done" ? (
                <Check className="h-4 w-4 text-emerald-500" aria-hidden="true" />
              ) : step.status === "failed" ? (
                <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />
              ) : step.key === runningKey ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                <span className="h-4 w-4 rounded-full border border-muted-foreground/30" aria-hidden="true" />
              )}
              <span className={step.status === "done" ? "text-muted-foreground" : ""}>
                {STEP_LABELS[step.key] ?? step.key}
              </span>
            </li>
          ))}
        </ol>
        {status?.lastError ? <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{status.lastError}</p> : null}
        {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
        {failed ? (
          <Button className="w-full" onClick={() => void retry()} disabled={retrying}>
            {retrying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />}
            Retry workspace setup
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
