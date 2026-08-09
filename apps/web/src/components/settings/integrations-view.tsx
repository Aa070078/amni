"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Card, CardContent, Skeleton, Switch } from "@amni/ui";
import { settingsClient } from "@/src/lib/settings";
import type { Integration } from "@amni/shared";

const CATEGORY_LABELS: Record<string, string> = {
  banking: "Banking",
  payments: "Payments",
  commerce: "Commerce",
  productivity: "Productivity",
  data: "Data",
};

export function IntegrationsView() {
  const queryClient = useQueryClient();

  const integrationsQuery = useQuery({
    queryKey: ["settings", "integrations"],
    queryFn: () => settingsClient.integrations(),
  });

  const toggleMutation = useMutation({
    mutationFn: (key: string) => settingsClient.toggleIntegration(key),
    onSuccess: (updated) => {
      queryClient.setQueryData(["settings", "integrations"], (current: Integration[] | undefined) => {
        if (!current) return current;
        return current.map((item) => (item.key === updated.key ? updated : item));
      });
    },
  });

  if (integrationsQuery.isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  const integrations = integrationsQuery.data ?? [];

  return (
    <div className="space-y-3">
      {integrations.map((integration) => {
        const connected = integration.connected;
        return (
          <Card key={integration.key}>
            <CardContent className="flex items-start justify-between gap-4 pt-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{integration.name}</h3>
                  <Badge variant="secondary">{CATEGORY_LABELS[integration.category] ?? integration.category}</Badge>
                  {connected ? <Badge variant="success">Connected</Badge> : null}
                </div>
                {integration.description ? (
                  <p className="text-sm text-muted-foreground">{integration.description}</p>
                ) : null}
                {integration.account ? (
                  <p className="font-mono text-xs text-muted-foreground">{integration.account}</p>
                ) : null}
              </div>
              <Switch
                checked={connected}
                onCheckedChange={() => toggleMutation.mutate(integration.key)}
                disabled={toggleMutation.isPending}
                aria-label={`Toggle ${integration.name}`}
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
