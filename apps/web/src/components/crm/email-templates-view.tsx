"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import { Button, Card, CardContent, Skeleton } from "@amni/ui";
import { crmClient, formatCrmDateTime } from "@/src/lib/crm";
import { CRM_REFERENCE_LABELS } from "./crm-badges";
import { CrmSectionHeader } from "./crm-nav";
import { NewEmailTemplateDialog } from "./email-templates/new-email-template-dialog";

export function EmailTemplatesView() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const templatesQuery = useQuery({
    queryKey: ["crm", "email-templates"],
    queryFn: () => crmClient.emailTemplates.list(),
    placeholderData: (previous) => previous,
  });

  const items = templatesQuery.data?.items ?? [];

  return (
    <div className="space-y-6">
      <CrmSectionHeader title="Email templates" description="Reusable messaging for consistent outreach.">
        <NewEmailTemplateDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onCreate={() => void queryClient.invalidateQueries({ queryKey: ["crm", "email-templates"] })}
        />
      </CrmSectionHeader>

      {templatesQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-44 rounded-lg" />
          ))}
        </div>
      ) : templatesQuery.isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <Mail className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-base font-semibold">Couldn&apos;t load templates</p>
              <p className="text-sm text-muted-foreground">Something went wrong. Please try again.</p>
            </div>
            <Button variant="outline" onClick={() => void templatesQuery.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <Mail className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-base font-semibold">No templates yet</p>
              <p className="text-sm text-muted-foreground">Create a template to reuse consistent email copy.</p>
            </div>
            <Button onClick={() => setDialogOpen(true)}>New template</Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((template) => (
            <li key={template.id} className="flex flex-col rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium text-foreground">{template.name}</h3>
                {template.referenceType ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {template.referenceType}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 truncate text-sm text-muted-foreground">{template.subject}</p>
              <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-xs text-muted-foreground">{template.body}</p>
              <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
                <span>{formatCrmDateTime(template.createdAt)}</span>
                {template.referenceType ? (
                  <span>{CRM_REFERENCE_LABELS[template.referenceType]}</span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
