"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Input, Label } from "@amni/ui";
import { api, ApiError } from "@/src/lib/api";

export function AcceptInviteForm() {
  const token = useSearchParams().get("token") ?? "";
  const router = useRouter();
  const [error, setError] = useState<string | null>(token ? null : "This invitation link is incomplete.");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");
    if (password !== confirmation) { setError("Passwords do not match."); return; }
    setError(null); setSubmitting(true);
    try {
      await api("/auth/accept-invitation", { method: "POST", body: { token, password } });
      router.replace("/dashboard"); router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "The invitation could not be accepted.");
    } finally { setSubmitting(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" minLength={8} autoComplete="new-password" required disabled={!token} />
        <p className="text-xs text-muted-foreground">Use uppercase, lowercase, and a number.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirmation">Confirm password</Label>
        <Input id="confirmation" name="confirmation" type="password" minLength={8} autoComplete="new-password" required disabled={!token} />
      </div>
      {error ? <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={submitting || !token}>{submitting ? "Joining…" : "Join workspace"}</Button>
    </form>
  );
}
