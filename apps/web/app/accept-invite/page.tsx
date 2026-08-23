import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@amni/ui";
import { Suspense } from "react";
import { AcceptInviteForm } from "./accept-invite-form";

export default function AcceptInvitePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Join your workspace</CardTitle>
          <CardDescription>Choose a strong password to accept your Amni invitation.</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<p className="text-sm text-muted-foreground">Loading invitation…</p>}>
            <AcceptInviteForm />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}
