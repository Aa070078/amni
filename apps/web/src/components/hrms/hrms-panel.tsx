"use client";

import * as React from "react";
import { ExternalLink, HeartHandshake, RefreshCw } from "lucide-react";
import { Button, Skeleton } from "@amni/ui";

import { ApiError } from "@/src/lib/api";
import { hrmsSsoUrl, hrmsStatus } from "@/src/lib/hrms";

type DeskState =
  | { kind: "loading" }
  | { kind: "unavailable"; message: string }
  | { kind: "error"; message: string }
  | { kind: "ready"; url: string; siteUrl: string };

const DESK_PAGE = "/app/hrms";

export function HrmsPanel() {
  const [state, setState] = React.useState<DeskState>({ kind: "loading" });
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({ kind: "loading" });
      try {
        const status = await hrmsStatus();
        if (cancelled) return;
        if (!status.available) {
          setState({
            kind: "unavailable",
            message: "HRMS is not installed for this workspace.",
          });
          return;
        }
        if (!status.tenantActive || !status.siteUrl) {
          setState({
            kind: "unavailable",
            message: "Your workspace is still being set up. HRMS will open here once provisioning finishes.",
          });
          return;
        }
        const sso = await hrmsSsoUrl(status.deskPath ?? DESK_PAGE);
        if (cancelled) return;
        setState({ kind: "ready", url: sso.url, siteUrl: sso.siteUrl });
      } catch (error) {
        if (cancelled) return;
        const message =
          error instanceof ApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Something went wrong while opening HRMS.";
        setState({ kind: "error", message });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return (
    <div className="flex flex-col gap-3">
      {state.kind === "ready" ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              Full HR suite — people, leave, attendance, payroll. Changes appear here instantly.
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setReloadKey((key) => key + 1)}
                aria-label="Reload HRMS"
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Reload
              </Button>
              <Button variant="outline" size="sm" type="button" asChild>
                <a href={state.siteUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  Open in new tab
                </a>
              </Button>
            </div>
          </div>
          <iframe
            key={reloadKey}
            title="HRMS — people, leave and payroll"
            src={state.url}
            className="h-[calc(100vh-11rem)] min-h-[520px] w-full rounded-md border"
          />
        </>
      ) : (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-md border border-dashed text-center">
          {state.kind === "loading" ? (
            <div className="flex w-full max-w-md flex-col gap-3 px-6">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : (
            <>
              <HeartHandshake className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
              <p className="max-w-sm px-6 text-sm text-muted-foreground">{state.message}</p>
              {state.kind === "error" ? (
                <Button variant="outline" size="sm" type="button" onClick={() => setReloadKey((key) => key + 1)}>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  Try again
                </Button>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  );
}
