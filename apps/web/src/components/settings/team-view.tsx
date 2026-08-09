"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, UserPlus } from "lucide-react";
import type { InviteMemberInput, TeamMember, TeamRole } from "@amni/shared";
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@amni/ui";
import { settingsClient } from "@/src/lib/settings";

const TEAM_ROLES: { value: TeamRole; label: string }[] = [
  { value: "OWNER", label: "Owner" },
  { value: "ADMIN", label: "Admin" },
  { value: "ACCOUNTANT", label: "Accountant" },
  { value: "SALES", label: "Sales" },
  { value: "INVENTORY", label: "Inventory" },
  { value: "MEMBER", label: "Member" },
];

const STATUS_VARIANTS: Record<TeamMember["status"], "default" | "secondary" | "outline" | "success" | "destructive"> = {
  active: "success",
  invited: "outline",
  disabled: "secondary",
};

function initials(firstName: string, lastName?: string): string {
  return `${firstName[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "?";
}

export function TeamView() {
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [inviteForm, setInviteForm] = React.useState<InviteMemberInput>({
    email: "",
    firstName: "",
    lastName: "",
    role: "MEMBER",
  });
  const [inviteError, setInviteError] = React.useState<string | null>(null);

  const teamQuery = useQuery({
    queryKey: ["settings", "team"],
    queryFn: () => settingsClient.team(),
  });

  const inviteMutation = useMutation({
    mutationFn: (input: InviteMemberInput) => settingsClient.invite(input),
    onSuccess: (member) => {
      queryClient.setQueryData(["settings", "team"], (current: TeamMember[] | undefined) =>
        current ? [...current, member] : current,
      );
      setInviteOpen(false);
      setInviteForm({ email: "", firstName: "", lastName: "", role: "MEMBER" });
      setInviteError(null);
    },
    onError: (error: Error) => setInviteError(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: { role?: TeamRole; status?: TeamMember["status"] } }) =>
      settingsClient.updateMember(id, input),
    onSuccess: (updated) => {
      queryClient.setQueryData(["settings", "team"], (current: TeamMember[] | undefined) =>
        current ? current.map((member) => (member.id === updated.id ? updated : member)) : current,
      );
    },
  });

  const members = teamQuery.data ?? [];

  if (teamQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {members.length} member{members.length === 1 ? "" : "s"} on the {""}
          Growth plan (10 seats)
        </p>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Invite member
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{initials(member.firstName, member.lastName)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {member.firstName} {member.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <select
                    aria-label={`Role for ${member.firstName}`}
                    className="h-8 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={member.role}
                    disabled={member.role === "OWNER" || updateMutation.isPending}
                    onChange={(e) =>
                      updateMutation.mutate({ id: member.id, input: { role: e.target.value as TeamRole } })
                    }
                  >
                    {TEAM_ROLES.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANTS[member.status]}>{member.status}</Badge>
                </TableCell>
                <TableCell>
                  {member.lastActive ? new Date(member.lastActive).toLocaleDateString() : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite a member</DialogTitle>
            <DialogDescription>
              They&apos;ll receive an email to join your workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="invite-first">First name</Label>
              <Input
                id="invite-first"
                value={inviteForm.firstName}
                onChange={(e) => setInviteForm((prev) => ({ ...prev, firstName: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-last">Last name</Label>
              <Input
                id="invite-last"
                value={inviteForm.lastName ?? ""}
                onChange={(e) => setInviteForm((prev) => ({ ...prev, lastName: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-role">Role</Label>
              <select
                id="invite-role"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={inviteForm.role}
                onChange={(e) => setInviteForm((prev) => ({ ...prev, role: e.target.value as TeamRole }))}
              >
                {TEAM_ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
            {inviteError ? <p className="text-sm text-destructive">{inviteError}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => inviteMutation.mutate(inviteForm)}
              disabled={
                inviteMutation.isPending || !inviteForm.email || !inviteForm.firstName
              }
            >
              {inviteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              Send invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
