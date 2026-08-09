"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge, Card, CardContent, Skeleton } from "@amni/ui";
import { settingsClient } from "@/src/lib/settings";

export function RolesView() {
  const rolesQuery = useQuery({
    queryKey: ["settings", "roles"],
    queryFn: () => settingsClient.roles(),
  });

  if (rolesQuery.isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-40 w-full" />
        ))}
      </div>
    );
  }

  const roles = rolesQuery.data ?? [];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {roles.map((role) => (
        <Card key={role.key}>
          <CardContent className="space-y-3 pt-6">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold">{role.name}</h3>
              <Badge variant="secondary">
                {role.members} member{role.members === 1 ? "" : "s"}
              </Badge>
            </div>
            {role.description ? (
              <p className="text-sm text-muted-foreground">{role.description}</p>
            ) : null}
            <div className="flex flex-wrap gap-1.5">
              {role.permissions.length === 0 ? (
                <span className="text-xs text-muted-foreground">No permissions</span>
              ) : (
                role.permissions.slice(0, 4).map((permission) => (
                  <span
                    key={permission}
                    className="rounded-full border border-border px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
                  >
                    {permission}
                  </span>
                ))
              )}
              {role.permissions.length > 4 ? (
                <span className="text-[11px] text-muted-foreground">
                  +{role.permissions.length - 4} more
                </span>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
