import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@amni/ui";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Create your workspace</CardTitle>
          <CardDescription>
            We&apos;ll provision your isolated ERP as you complete a quick setup — usually in under a
            minute.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignupForm />
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
