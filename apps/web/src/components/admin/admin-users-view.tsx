"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, ShieldOff, UserCheck, UserX } from "lucide-react";
import { Button, Input } from "@amni/ui";
import { adminClient } from "@/src/lib/admin";
import type { AdminUserSummary } from "@amni/shared";

const STATUS_OPTIONS = ["", "ACTIVE", "SUSPENDED", "ARCHIVED"] as const;

function StatusBadge({ status }: { status: AdminUserSummary["status"] }) {
  const colors: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-800",
    SUSPENDED: "bg-red-100 text-red-800",
    ARCHIVED: "bg-gray-100 text-gray-800",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] ?? "bg-gray-100"}`}>
      {status}
    </span>
  );
}

export function AdminUsersView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [status, setStatus] = React.useState<string>("");
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", page, debouncedSearch, status],
    queryFn: () => adminClient.users({ page, pageSize: 20, q: debouncedSearch || undefined, status: (status || undefined) as AdminUserSummary["status"] | undefined }),
  });

  const suspendMut = useMutation({
    mutationFn: (id: string) => adminClient.suspendUser(id),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["admin", "users"] }); },
  });
  const activateMut = useMutation({
    mutationFn: (id: string) => adminClient.activateUser(id),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["admin", "users"] }); },
  });
  const promoteMut = useMutation({
    mutationFn: (id: string) => adminClient.promoteUser(id),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["admin", "users"] }); },
  });
  const demoteMut = useMutation({
    mutationFn: (id: string) => adminClient.demoteUser(id),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["admin", "users"] }); },
  });

  const items = data?.items ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72"
        />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s || "All statuses"}</option>
          ))}
        </select>
        <span className="ml-auto text-sm text-muted-foreground">{total} users</span>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Admin</th>
              <th className="px-4 py-3 font-medium">Last login</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No users found</td></tr>
            ) : items.map((user) => (
              <tr key={user.id} className="border-b last:border-b-0">
                <td className="px-4 py-3 font-mono text-xs">{user.email}</td>
                <td className="px-4 py-3">{user.firstName} {user.lastName ?? ""}</td>
                <td className="px-4 py-3"><StatusBadge status={user.status} /></td>
                <td className="px-4 py-3">
                  {user.isPlatformAdmin ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                      <Shield className="h-3 w-3" /> Admin
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : "Never"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {user.status === "ACTIVE" ? (
                      <Button variant="outline" size="sm" onClick={() => suspendMut.mutate(user.id)} disabled={suspendMut.isPending || user.isPlatformAdmin} title={user.isPlatformAdmin ? "Cannot suspend admin" : "Suspend"}>
                        <UserX className="h-3 w-3" />
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => activateMut.mutate(user.id)} disabled={activateMut.isPending} title="Activate">
                        <UserCheck className="h-3 w-3" />
                      </Button>
                    )}
                    {user.isPlatformAdmin ? (
                      <Button variant="outline" size="sm" onClick={() => demoteMut.mutate(user.id)} disabled={demoteMut.isPending} title="Demote from admin">
                        <ShieldOff className="h-3 w-3" />
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => promoteMut.mutate(user.id)} disabled={promoteMut.isPending} title="Promote to admin">
                        <Shield className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
