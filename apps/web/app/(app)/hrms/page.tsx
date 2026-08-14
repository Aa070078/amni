import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, HeartHandshake, Users } from "lucide-react";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@amni/ui";

import { HrmsPanel } from "@/src/components/hrms/hrms-panel";

export const metadata: Metadata = { title: "HRMS" };

export default function HrmsPage() {
  return (
    <div className="mx-auto w-full space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">HRMS</h1>
        <p className="mt-1 text-sm text-muted-foreground">People, leave, attendance and payroll</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            People
            <Badge variant="success">Live</Badge>
          </CardTitle>
          <CardDescription>
            People you work with — your team, partners and external contacts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/people/contacts"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Open contacts
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HeartHandshake className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            HR & Payroll
            <Badge variant="secondary">Embedded</Badge>
          </CardTitle>
          <CardDescription>
            The full HR suite runs inside your workspace — employees, leave, attendance, shifts,
            appraisals, recruitment and payroll.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HrmsPanel />
        </CardContent>
      </Card>
    </div>
  );
}
