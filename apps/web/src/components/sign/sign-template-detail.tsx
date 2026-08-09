"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ClipboardX, Layers, ShieldCheck, UserRound } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from "@amni/ui";
import { AmniApiError } from "@/src/lib/client";
import { signClient } from "@/src/lib/sign";
import { SignDocumentTypeBadge, SignTemplateStatusBadge } from "./sign-status";

interface SignTemplateDetailViewProps {
  code: string;
}

export function SignTemplateDetailView({ code }: SignTemplateDetailViewProps) {
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ["sign", "templates", code],
    queryFn: () => signClient.templateDetail(code),
    retry: (failureCount, error) => {
      if (error instanceof AmniApiError && error.status === 404) return false;
      return failureCount < 2;
    },
  });

  const archiveTemplate = useMutation({
    mutationFn: () => signClient.changeTemplateStatus(code, "archived"),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sign", "templates", code] });
      void queryClient.invalidateQueries({ queryKey: ["sign", "templates"] });
      void queryClient.invalidateQueries({ queryKey: ["sign", "overview"] });
    },
  });

  const removeTemplate = useMutation({
    mutationFn: () => signClient.removeTemplate(code),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sign", "templates"] });
      window.location.assign("/finance/sign");
    },
  });

  if (detailQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (detailQuery.isError) {
    const is404 = detailQuery.error instanceof AmniApiError && detailQuery.error.status === 404;
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
          <Layers className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-base font-semibold">
              {is404 ? "Template not found" : "Couldn&apos;t load this template"}
            </p>
            <p className="text-sm text-muted-foreground">
              {is404
                ? `No template matches ${code}. It may have been removed.`
                : "Something went wrong. Please try again."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!is404 ? (
              <Button variant="outline" onClick={() => void detailQuery.refetch()}>
                Retry
              </Button>
            ) : null}
            <Button asChild variant={is404 ? "default" : "outline"}>
              <Link href="/finance/sign">
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Back to sign
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const template = detailQuery.data;
  if (!template) return null;

  const isActive = template.status === "active";

  return (
    <div className="space-y-6">
      <Link
        href="/finance/sign"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Sign
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{template.name}</h1>
              <SignTemplateStatusBadge status={template.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{template.code}</p>
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:items-end">
            <div className="flex flex-wrap items-center gap-2">
              {isActive ? (
                <Button
                  variant="outline"
                  disabled={archiveTemplate.isPending}
                  onClick={() => {
                    if (window.confirm(`Archive ${template.code}?`)) archiveTemplate.mutate();
                  }}
                >
                  Archive
                </Button>
              ) : null}
              <Button
                variant="outline"
                disabled={removeTemplate.isPending}
                onClick={() => {
                  if (window.confirm(`Delete ${template.code}? This cannot be undone.`)) removeTemplate.mutate();
                }}
              >
                <ClipboardX className="mr-2 h-4 w-4" aria-hidden="true" />
                Delete
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Details
            </CardTitle>
            <CardDescription>General information about this template.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-2.5">
              <Layers className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Document type</p>
                <div className="mt-0.5">
                  <SignDocumentTypeBadge documentType={template.documentType} />
                </div>
              </div>
            </div>
            <DetailValue label="Version" value={`v${template.version}`} />
            <DetailValue label="Created" value={new Date(template.createdAt).toLocaleDateString()} />
            <DetailValue label="Last updated" value={new Date(template.updatedAt).toLocaleDateString()} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRound className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Signer roles
            </CardTitle>
            <CardDescription>Roles required whenever this template is used.</CardDescription>
          </CardHeader>
          <CardContent>
            {template.signerRoles.length > 0 ? (
              <ul className="space-y-2">
                {template.signerRoles.map((role) => (
                  <li
                    key={role}
                    className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-foreground"
                  >
                    <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    {role}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No signer roles defined.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DetailValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="truncate text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
}
