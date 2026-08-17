"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { CircleAlert, ServerOff, TriangleAlert } from "lucide-react";
import { Badge, Button, CardHeader, CardTitle } from "@amni/ui";
import { ApiError } from "@/src/lib/api";

interface PanelHeaderProps {
  title: string;
  icon: LucideIcon;
  count?: number;
  action?: ReactNode;
}

export function PanelHeader({ title, icon: Icon, count, action }: PanelHeaderProps) {
  return (
    <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
      <CardTitle className="flex items-center gap-2 text-base">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {title}
        {count !== undefined && count > 0 ? <Badge variant="secondary">{count}</Badge> : null}
      </CardTitle>
      {action}
    </CardHeader>
  );
}

const PANEL_ERROR_COPY: Record<string, { title: string; description: string; icon: LucideIcon }> = {
  erp_unreachable: {
    title: "Business data is offline",
    description:
      "Amni can’t reach this workspace’s ERP service. Your account is safe; reconnect ERPNext and try again.",
    icon: ServerOff,
  },
  erp_unauthorized: {
    title: "Workspace connection needs attention",
    description:
      "The ERPNext service account could not authenticate. Ask a workspace owner to reconnect it.",
    icon: CircleAlert,
  },
  tenant_not_ready: {
    title: "Workspace is still getting ready",
    description: "Provisioning hasn’t finished yet. Give it a moment, then try again.",
    icon: CircleAlert,
  },
};

export function PanelError({ error, onRetry }: { error?: unknown; onRetry: () => void }) {
  const copy = error instanceof ApiError ? PANEL_ERROR_COPY[error.code] : undefined;
  const Icon = copy?.icon ?? TriangleAlert;

  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center" role="alert">
      <Icon className="h-6 w-6 text-destructive" aria-hidden />
      <p className="text-sm font-medium">{copy?.title ?? "Couldn’t load dashboard data"}</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        {copy?.description ??
          "Something interrupted this request. Try again, or refresh the page if it continues."}
      </p>
      <Button size="sm" variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

interface PanelEmptyProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function PanelEmpty({ icon: Icon, title, description, action }: PanelEmptyProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}
