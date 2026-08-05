"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { TriangleAlert } from "lucide-react";
import { Badge, Button, CardHeader, CardTitle } from "@amni/ui";

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

export function PanelError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center" role="alert">
      <TriangleAlert className="h-6 w-6 text-destructive" aria-hidden />
      <p className="text-sm font-medium">Couldn&apos;t load this panel</p>
      <p className="text-sm text-muted-foreground">It didn&apos;t affect the rest of the page.</p>
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
