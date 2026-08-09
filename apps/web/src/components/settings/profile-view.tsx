"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Save } from "lucide-react";
import type { UpdateProfileInput } from "@amni/shared";
import { Avatar, AvatarFallback, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Skeleton } from "@amni/ui";
import { settingsClient } from "@/src/lib/settings";

export function ProfileView() {
  const queryClient = useQueryClient();
  const [form, setForm] = React.useState<UpdateProfileInput>({});
  const [saved, setSaved] = React.useState(false);

  const profileQuery = useQuery({
    queryKey: ["settings", "profile"],
    queryFn: () => settingsClient.profile(),
  });

  const profile = profileQuery.data;

  React.useEffect(() => {
    if (profile) {
      setForm({ firstName: profile.firstName, lastName: profile.lastName, jobTitle: profile.jobTitle });
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: (input: UpdateProfileInput) => settingsClient.updateProfile(input),
    onSuccess: (data) => {
      queryClient.setQueryData(["settings", "profile"], data);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
    },
  });

  if (profileQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Your profile is unavailable right now.
        </CardContent>
      </Card>
    );
  }

  const initials = `${profile.firstName[0] ?? ""}${profile.lastName?.[0] ?? ""}`.toUpperCase() || "?";

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">
              {profile.firstName} {profile.lastName}
            </p>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
            {profile.jobTitle ? <p className="text-sm text-muted-foreground">{profile.jobTitle}</p> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Personal details</CardTitle>
          <CardDescription>Your name and role as shown to your team.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="profile-first">First name</Label>
            <Input
              id="profile-first"
              value={form.firstName ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-last">Last name</Label>
            <Input
              id="profile-last"
              value={form.lastName ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="profile-title">Job title</Label>
            <Input
              id="profile-title"
              value={form.jobTitle ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, jobTitle: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="h-4 w-4" aria-hidden="true" />
          )}
          Save changes
        </Button>
        {saved ? (
          <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Saved
          </span>
        ) : null}
      </div>
    </div>
  );
}
