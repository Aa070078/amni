import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, KeyRound, ShieldCheck, Users } from "lucide-react";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@amni/ui";

export const metadata: Metadata = { title: "People" };

const COMING_SOON = [
  { title: "Roles & access", description: "Control what each team member can see and do.", icon: ShieldCheck },
  { title: "User accounts", description: "Invite and manage who can sign in to your workspace.", icon: KeyRound },
];

export default function PeoplePage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">People</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Contacts, roles and access.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/people/contacts" className="group">
          <Card className="h-full transition-colors hover:border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Contacts
                <Badge variant="secondary">Live</Badge>
              </CardTitle>
              <CardDescription>The people you work with across your workspace.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
              View contacts
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </CardContent>
          </Card>
        </Link>
        {COMING_SOON.map(({ title, description, icon: Icon }) => (
          <Card key={title} className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                {title}
                <Badge variant="secondary">Coming soon</Badge>
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
