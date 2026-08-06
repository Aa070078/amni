"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@amni/ui";
import { api, ApiError } from "@/src/lib/api";
import type { MeUser } from "@/src/hooks/use-me";

export function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    try {
      await api<{ data: { user: MeUser } }>("/auth/register", {
        method: "POST",
        body: {
          email: form.get("email"),
          password: form.get("password"),
          firstName: form.get("name"),
          companyName: form.get("company"),
          country: form.get("country") || "US",
        },
      });
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError) {
        const field = e.fieldErrors?.["email"]?.[0] ?? e.message;
        setError(field);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" name="name" autoComplete="name" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Work email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="company">Company name</Label>
        <Input id="company" name="company" autoComplete="organization" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="country">Country code</Label>
        <Input id="country" name="country" defaultValue="US" maxLength={3} autoComplete="country" required />
        <p className="text-xs text-muted-foreground">2–3 letter country code, e.g. US, GB, DE.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          minLength={8}
          autoComplete="new-password"
          required
        />
        <p className="text-xs text-muted-foreground">At least 8 characters with uppercase, lowercase and a number.</p>
      </div>
      {error ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
