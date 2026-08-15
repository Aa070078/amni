"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Loader2, Plus, RefreshCw, UploadCloud } from "lucide-react";
import type { ImportJob, ImportStage } from "@amni/shared";
import { Badge, Button, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@amni/ui";

import { ApiError } from "@/src/lib/api";
import { importsClient } from "@/src/lib/imports";
import { ImportWizard } from "./import-wizard";

const KIND_LABELS: Record<string, string> = {
  customers: "Customers",
  items: "Products",
  suppliers: "Suppliers",
  contacts: "Contacts",
  leads: "Leads",
};

const STAGE_BADGES: Record<ImportStage, { label: string; variant: "default" | "secondary" | "success" | "warning" }> = {
  PRE_IMPORT: { label: "Not started", variant: "secondary" },
  UPLOAD: { label: "Awaiting mapping", variant: "secondary" },
  MAPPING: { label: "Ready to validate", variant: "secondary" },
  VALIDATION: { label: "Validated", variant: "warning" },
  IMPORT: { label: "Importing", variant: "default" },
  COMPLETED: { label: "Completed", variant: "success" },
};

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export function ImportsView() {
  const queryClient = useQueryClient();
  const [wizard, setWizard] = React.useState<{ open: boolean; job: ImportJob | null }>({
    open: false,
    job: null,
  });

  const jobsQuery = useQuery({
    queryKey: ["imports", "jobs"],
    queryFn: importsClient.list,
  });

  const invalidate = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["imports"] });
  }, [queryClient]);

  if (wizard.open) {
    return (
      <ImportWizard
        initialJob={wizard.job}
        onChanged={invalidate}
        onClose={() => setWizard({ open: false, job: null })}
      />
    );
  }

  return (
    <div className="mx-auto w-full space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Import data</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Bring customers, products, suppliers, contacts and leads into your ERP from CSV or XLSX.
          </p>
        </div>
        <Button type="button" onClick={() => setWizard({ open: true, job: null })}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          New import
        </Button>
      </div>

      {jobsQuery.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : jobsQuery.isError ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {jobsQuery.error instanceof ApiError
              ? jobsQuery.error.message
              : "Imports are unavailable right now."}
          </p>
          <Button variant="outline" size="sm" type="button" onClick={() => jobsQuery.refetch()}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </Button>
        </div>
      ) : (jobsQuery.data?.items.length ?? 0) === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
          <UploadCloud className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium">No imports yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Download a template, fill it with your data, and upload it here — we guide you through every step.
            </p>
          </div>
          <Button type="button" onClick={() => setWizard({ open: true, job: null })}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Start your first import
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rows</TableHead>
                <TableHead>Started</TableHead>
                <TableHead className="w-24">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(jobsQuery.data?.items ?? []).map((job) => {
                const badge = STAGE_BADGES[job.stage];
                return (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">{KIND_LABELS[job.kind] ?? job.kind}</TableCell>
                    <TableCell>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">{job.fileMetadata?.totalRows ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {dateFormatter.format(new Date(job.createdAt))}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => setWizard({ open: true, job })}
                        aria-label={`Open import ${KIND_LABELS[job.kind] ?? job.kind} started ${dateFormatter.format(new Date(job.createdAt))}`}
                      >
                        {job.stage === "IMPORT" ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        )}
                        Open
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
