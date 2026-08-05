import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@amni/ui";
import type { QuickAction } from "@amni/shared";

export function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {actions.map((action) => (
        <Button key={action.id} variant="outline" className="h-auto justify-between px-4 py-3" asChild>
          <Link href={action.href}>
            <span className="flex flex-col items-start gap-0.5 text-left">
              <span className="text-sm font-medium">{action.label}</span>
              {action.description ? (
                <span className="text-xs font-normal text-muted-foreground">{action.description}</span>
              ) : null}
            </span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
          </Link>
        </Button>
      ))}
    </div>
  );
}
