import type { LucideIcon } from "lucide-react";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@amni/ui";

interface ModulePageProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

export function ModulePage({ title, description, icon: Icon }: ModulePageProps) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className="h-4 w-4 text-muted-foreground" />
            {title}
            <Badge variant="secondary">Coming soon</Badge>
          </CardTitle>
          <CardDescription>This module ships in a later milestone.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          The app shell and navigation are live; the {title.toLowerCase()} workspace builds on top.
        </CardContent>
      </Card>
    </div>
  );
}
