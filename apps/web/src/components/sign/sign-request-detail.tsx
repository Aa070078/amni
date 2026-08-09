"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardX,
  FileSignature,
  Hash,
  Mail,
  StickyNote,
} from "lucide-react";
import { useState } from "react";
import { SIGN_REQUEST_STATUSES, type SignRequestStatus } from "@amni/shared";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from "@amni/ui";
import { AmniApiError } from "@/src/lib/client";
import { signClient } from "@/src/lib/sign";
import {
  SignDocumentTypeBadge,
  SignRequestStatusBadge,
  SignerStatusBadge,
} from "./sign-status";

interface SignRequestDetailViewProps {
  code: string;
}

export function SignRequestDetailView({ code }: SignRequestDetailViewProps) {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: ["sign", "requests", code],
    queryFn: () => signClient.requestDetail(code),
    retry: (failureCount, error) => {
      if (error instanceof AmniApiError && error.status === 404) return false;
      return failureCount < 2;
    },
  });

  const changeStatus = useMutation({
    mutationFn: (status: SignRequestStatus) => signClient.changeRequestStatus(code, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sign", "requests", code] });
      void queryClient.invalidateQueries({ queryKey: ["sign", "requests"] });
      void queryClient.invalidateQueries({ queryKey: ["sign", "overview"] });
    },
  });

  const markSigned = useMutation({
    mutationFn: (signerCode: string) => signClient.markSignerSigned(code, signerCode),
    onSuccess: (request) => {
      void queryClient.invalidateQueries({ queryKey: ["sign", "requests", code] });
      void queryClient.invalidateQueries({ queryKey: ["sign", "requests"] });
      void queryClient.invalidateQueries({ queryKey: ["sign", "overview"] });
      const remaining = request.signers.filter((signer) => signer.status === "pending").length;
      setNotice(remaining === 0 ? "All signers have signed. Request completed." : "Signer marked as signed.");
    },
  });

  const removeRequest = useMutation({
    mutationFn: () => signClient.removeRequest(code),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sign", "requests"] });
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
          <FileSignature className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-base font-semibold">
              {is404 ? "Signature request not found" : "Couldn&apos;t load this request"}
            </p>
            <p className="text-sm text-muted-foreground">
              {is404
                ? `No signature request matches ${code}. It may have been removed.`
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

  const request = detailQuery.data;
  if (!request) return null;

  const isDraft = request.status === "draft";
  const isCompleted = request.status === "completed";
  const isDeclined = request.status === "declined";

  return (
    <div className="space-y-6">
      <Link
        href="/finance/sign"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Sign
      </Link>

      {notice ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{notice}</span>
        </div>
      ) : null}

      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{request.title}</h1>
              <SignRequestStatusBadge status={request.status} />
              <SignDocumentTypeBadge documentType={request.documentType} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{request.code}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>{request.documentCode ? `Document ${request.documentCode}` : "No linked document"}</span>
              {request.expiresAt ? <span>Expires {new Date(request.expiresAt).toLocaleDateString()}</span> : null}
              {request.createdBy ? <span>{request.createdBy}</span> : null}
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:items-end">
            <div className="flex flex-wrap items-center gap-2">
              {isDraft ? (
                <Button disabled={changeStatus.isPending} onClick={() => changeStatus.mutate("sent")}>
                  Send for signature
                </Button>
              ) : null}
              {isDraft || request.status === "sent" ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" disabled={changeStatus.isPending}>
                      Change status
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Set status</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {SIGN_REQUEST_STATUSES.filter((option) => !["draft"].includes(option.value)).map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        disabled={option.value === request.status || changeStatus.isPending}
                        onClick={() => changeStatus.mutate(option.value)}
                      >
                        {option.value === request.status ? (
                          <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                        ) : (
                          <span className="mr-2 inline-block w-4" aria-hidden="true" />
                        )}
                        {option.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
              {isDraft || isDeclined ? (
                <Button
                  variant="outline"
                  disabled={removeRequest.isPending}
                  onClick={() => {
                    if (window.confirm(`Delete ${request.code}? This cannot be undone.`)) removeRequest.mutate();
                  }}
                >
                  <ClipboardX className="mr-2 h-4 w-4" aria-hidden="true" />
                  Delete
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileSignature className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Signers
              </CardTitle>
              <CardDescription>Every person who needs to sign this document.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Signer</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="w-32">Status</TableHead>
                    <TableHead className="w-40 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {request.signers.map((signer) => (
                    <TableRow key={signer.code}>
                      <TableCell>
                        <p className="font-medium text-foreground">{signer.name}</p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" aria-hidden="true" />
                          {signer.email}
                        </p>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{signer.role ?? "—"}</TableCell>
                      <TableCell>
                        <SignerStatusBadge status={signer.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {signer.status === "pending" && !isCompleted ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={markSigned.isPending}
                            onClick={() => markSigned.mutate(signer.code)}
                          >
                            Mark signed
                          </Button>
                        ) : signer.signedAt ? (
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {new Date(signer.signedAt).toLocaleString()}
                          </span>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell className="font-medium text-foreground" colSpan={3}>
                      Progress
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-medium tabular-nums",
                        request.signers.every((signer) => signer.status === "signed")
                          ? "text-success"
                          : "text-foreground",
                      )}
                    >
                      {request.signers.filter((signer) => signer.status === "signed").length}/
                      {request.signers.length} signed
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Hash className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DetailRow icon={CalendarDays} label="Created" value={new Date(request.createdAt).toLocaleDateString()} />
              <DetailRow icon={Hash} label="Last updated" value={new Date(request.updatedAt).toLocaleDateString()} />
              <DetailRow icon={CalendarDays} label="Expires" value={request.expiresAt ? new Date(request.expiresAt).toLocaleDateString() : "—"} />
              <DetailRow icon={Hash} label="Created by" value={request.createdBy ?? "—"} />
            </CardContent>
          </Card>

          {request.notes ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <StickyNote className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{request.notes}</p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="truncate text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
}
