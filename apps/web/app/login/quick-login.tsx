"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@amni/ui";
import { api, ApiError } from "@/src/lib/api";

const DEMO_ACCOUNTS = [
  { label: "Demo Admin", email: "demo@amni.dev", password: "demo12345", role: "Owner" },
  { label: "Demo Member", email: "member@amni.dev", password: "member12345", role: "Member" },
] as const;

export function QuickLogin({ next = "/dashboard" }: { next?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_DEMO_MODE !== "true") return null;

  async function login(account: (typeof DEMO_ACCOUNTS)[number]) {
    setPending(account.email);
    setError(null);
    try {
      await api("/auth/login", { method: "POST", body: { email: account.email, password: account.password } });
      router.push(next);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Quick login failed. Please try again.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wide text-muted-foreground">Quick log in</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      {error ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        {DEMO_ACCOUNTS.map((account) => (
          <Button
            key={account.email}
            type="button"
            variant="outline"
            onClick={() => login(account)}
            disabled={pending !== null}
            className="flex-col items-start gap-0.5 px-3 py-2 h-auto"
          >
            <span className="text-sm font-medium">{account.label}</span>
            <span className="text-xs font-normal text-muted-foreground">{account.role}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
