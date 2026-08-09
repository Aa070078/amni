"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileSignature, Layers, Loader2 } from "lucide-react";
import { useState } from "react";
import type { LegacyColumnDef } from "@tanstack/react-table/legacy";
import type { SignRequest, SignTemplate } from "@amni/shared";
import {
  Button,
  Card,
  CardContent,
  DataTable,
  DataTableColumnHeader,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@amni/ui";
import { formatRelativeTime } from "@/src/lib/format";
import { signClient } from "@/src/lib/sign";
import { PanelEmpty, PanelError } from "@/src/components/dashboard/panel-utils";
import { NewSignRequestDialog } from "./new-sign-request-dialog";
import { NewSignTemplateDialog } from "./new-sign-template-dialog";
import { SignDocumentTypeBadge, SignRequestStatusBadge, SignTemplateStatusBadge } from "./sign-status";

const REQUEST_COLUMNS: LegacyColumnDef<SignRequest>[] = [
  {
    accessorKey: "code",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Request" />,
    cell: ({ row }) => (
      <Link
        href={`/finance/sign/requests/${row.original.code}`}
        className="font-medium tabular-nums text-foreground hover:text-primary hover:underline"
      >
        {row.original.code}
      </Link>
    ),
  },
  {
    accessorKey: "title",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Title" />,
    cell: ({ row }) => <span className="text-foreground">{row.original.title}</span>,
  },
  {
    accessorKey: "documentType",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Document" />,
    cell: ({ row }) => <SignDocumentTypeBadge documentType={row.original.documentType} />,
  },
  {
    accessorKey: "signers",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Signers" />,
    cell: ({ row }) => {
      const total = row.original.signers.length;
      const signed = row.original.signers.filter((signer) => signer.status === "signed").length;
      return (
        <span className="tabular-nums text-muted-foreground">
          {signed}/{total} signed
        </span>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
    cell: ({ row }) => (
      <span className="text-muted-foreground">{formatRelativeTime(row.original.createdAt)}</span>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => <SignRequestStatusBadge status={row.original.status} />,
  },
];

const TEMPLATE_COLUMNS: LegacyColumnDef<SignTemplate>[] = [
  {
    accessorKey: "code",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Template" />,
    cell: ({ row }) => (
      <Link
        href={`/finance/sign/templates/${row.original.code}`}
        className="font-medium tabular-nums text-foreground hover:text-primary hover:underline"
      >
        {row.original.code}
      </Link>
    ),
  },
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => <span className="text-foreground">{row.original.name}</span>,
  },
  {
    accessorKey: "documentType",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Document" />,
    cell: ({ row }) => <SignDocumentTypeBadge documentType={row.original.documentType} />,
  },
  {
    accessorKey: "signerRoles",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Roles" />,
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.signerRoles.join(", ")}</span>,
  },
  {
    accessorKey: "version",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Version" />,
    cell: ({ row }) => <span className="tabular-nums text-muted-foreground">v{row.original.version}</span>,
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => <SignTemplateStatusBadge status={row.original.status} />,
  },
];

export function SignView() {
  const queryClient = useQueryClient();
  const [created, setCreated] = useState<{ code: string; label: string } | null>(null);

  const overviewQuery = useQuery({
    queryKey: ["sign", "overview"],
    queryFn: () => signClient.overview(),
  });

  const requestsQuery = useQuery({
    queryKey: ["sign", "requests"],
    queryFn: () => signClient.listRequests({ page: 1, pageSize: 100, sortBy: "createdAt", sortDir: "desc" }),
    placeholderData: (previous) => previous,
  });

  const templatesQuery = useQuery({
    queryKey: ["sign", "templates"],
    queryFn: () => signClient.listTemplates({ page: 1, pageSize: 100, sortBy: "createdAt", sortDir: "desc" }),
    placeholderData: (previous) => previous,
  });

  const resendRequest = useMutation({
    mutationFn: (code: string) => signClient.changeRequestStatus(code, "awaiting_signature"),
    onSuccess: (request) => {
      void queryClient.invalidateQueries({ queryKey: ["sign", "requests"] });
      void queryClient.invalidateQueries({ queryKey: ["sign", "overview"] });
      setCreated({ code: request.code, label: `Re-sent ${request.code}` });
    },
  });

  const archiveTemplate = useMutation({
    mutationFn: (code: string) => signClient.changeTemplateStatus(code, "archived"),
    onSuccess: (template) => {
      void queryClient.invalidateQueries({ queryKey: ["sign", "templates"] });
      void queryClient.invalidateQueries({ queryKey: ["sign", "overview"] });
      setCreated({ code: template.code, label: `Archived ${template.code}` });
    },
  });

  const requests = requestsQuery.data;
  const templates = templatesQuery.data;

  const loading = requestsQuery.isLoading || templatesQuery.isLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sign</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Requests, templates, and signature tracking for your workspace.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NewSignTemplateDialog
            onCreated={(template) => {
              void queryClient.invalidateQueries({ queryKey: ["sign", "templates"] });
              void queryClient.invalidateQueries({ queryKey: ["sign", "overview"] });
              setCreated({ code: template.code, label: `Created ${template.code}` });
            }}
          />
          <NewSignRequestDialog
            onCreated={(request) => {
              void queryClient.invalidateQueries({ queryKey: ["sign", "requests"] });
              void queryClient.invalidateQueries({ queryKey: ["sign", "overview"] });
              setCreated({ code: request.code, label: `Created ${request.code}` });
            }}
          />
        </div>
      </div>

      {created ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{created.label}</span>
        </div>
      ) : null}

      {overviewQuery.isError || requestsQuery.isError || templatesQuery.isError ? (
        <Card>
          <CardContent className="p-6">
            <PanelError
              onRetry={() => {
                void overviewQuery.refetch();
                void requestsQuery.refetch();
                void templatesQuery.refetch();
              }}
            />
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <div className="space-y-3 rounded-md border p-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-8" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {overviewQuery.data ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Awaiting signature</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight">
                    {overviewQuery.data.awaitingSignature}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Completed</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight">
                    {overviewQuery.data.completed}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Pending for you</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight">
                    {overviewQuery.data.pendingForMe}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Active templates</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight">
                    {overviewQuery.data.templatesActive}
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : null}

          <Tabs defaultValue="requests">
            <TabsList aria-label="Sign sections">
              <TabsTrigger value="requests">Requests</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
            </TabsList>

            <TabsContent value="requests" className="space-y-4">
              {!requests || requests.items.length === 0 ? (
                <Card>
                  <CardContent className="p-6">
                    <PanelEmpty
                      icon={FileSignature}
                      title="No signature requests yet"
                      description="Create a request to collect signatures on a document."
                    />
                  </CardContent>
                </Card>
              ) : (
                <DataTable
                  columns={REQUEST_COLUMNS}
                  data={requests.items}
                  searchable
                  globalSearchPlaceholder="Search requests…"
                  getRowId={(request) => (request as SignRequest).code}
                  bulkActions={(rows) => (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={resendRequest.isPending}
                      onClick={() => {
                        for (const request of rows) resendRequest.mutate(request.code);
                      }}
                    >
                      <Loader2 className={`mr-1 h-3.5 w-3.5 ${resendRequest.isPending ? "animate-spin" : ""}`} aria-hidden="true" />
                      Re-send
                    </Button>
                  )}
                  emptyState={{
                    icon: <FileSignature className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
                    title: "No signature requests",
                    description: "Create a request to collect signatures on a document.",
                  }}
                  noResultsState={{
                    icon: <FileSignature className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
                    title: "No matching requests",
                    description: "Try adjusting your search.",
                  }}
                />
              )}
            </TabsContent>

            <TabsContent value="templates" className="space-y-4">
              {!templates || templates.items.length === 0 ? (
                <Card>
                  <CardContent className="p-6">
                    <PanelEmpty
                      icon={Layers}
                      title="No templates yet"
                      description="Reusable signature templates will show here."
                    />
                  </CardContent>
                </Card>
              ) : (
                <DataTable
                  columns={TEMPLATE_COLUMNS}
                  data={templates.items}
                  searchable
                  globalSearchPlaceholder="Search templates…"
                  getRowId={(template) => (template as SignTemplate).code}
                  bulkActions={(rows) => (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={archiveTemplate.isPending}
                      onClick={() => {
                        for (const template of rows) archiveTemplate.mutate(template.code);
                      }}
                    >
                      Archive
                    </Button>
                  )}
                  emptyState={{
                    icon: <Layers className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
                    title: "No templates",
                    description: "Create a template to reuse signing setups.",
                  }}
                  noResultsState={{
                    icon: <Layers className="h-8 w-8 text-muted-foreground" aria-hidden="true" />,
                    title: "No matching templates",
                    description: "Try adjusting your search.",
                  }}
                />
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
