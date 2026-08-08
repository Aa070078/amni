"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  History,
  Phone,
  StickyNote,
  UserRound,
} from "lucide-react";
import { LEAD_STAGES, type LeadStage } from "@amni/shared";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@amni/ui";
import { formatCurrency } from "@/src/lib/format";
import { formatLeadDate, leadsClient, LeadsApiError } from "@/src/lib/leads";
import { LeadStageBadge, leadSourceLabel, leadStageLabel } from "./lead-stage";

interface LeadDetailViewProps {
  code: string;
}

export function LeadDetailView({ code }: LeadDetailViewProps) {
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ["leads", "detail", code],
    queryFn: () => leadsClient.detail(code),
    retry: (failureCount, error) => {
      if (error instanceof LeadsApiError && error.status === 404) return false;
      return failureCount < 2;
    },
  });

  const moveStage = useMutation({
    mutationFn: (stage: LeadStage) => leadsClient.moveStage(code, { stage }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["leads", "detail", code] });
      void queryClient.invalidateQueries({ queryKey: ["leads", "pipeline"] });
    },
  });

  if (detailQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-40 rounded-lg" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-48 rounded-lg lg:col-span-2" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </div>
    );
  }

  if (detailQuery.isError) {
    const is404 = detailQuery.error instanceof LeadsApiError && detailQuery.error.status === 404;
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
          <Building2 className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-base font-semibold">
              {is404 ? "Lead not found" : "Couldn&apos;t load this lead"}
            </p>
            <p className="text-sm text-muted-foreground">
              {is404
                ? `No lead matches ${code}. It may have been removed.`
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
              <Link href="/sales/leads">
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Back to leads
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const lead = detailQuery.data;
  if (!lead) return null;

  return (
    <div className="space-y-6">
      <Link
        href="/sales/leads"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Leads
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{lead.company}</h1>
              <span className="text-sm tabular-nums text-muted-foreground">{lead.code}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {lead.contactName} · {lead.contactEmail}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <LeadStageBadge stage={lead.stage} />
              <span className="text-sm text-muted-foreground">from {leadSourceLabel(lead.source)}</span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:items-end">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold tabular-nums tracking-tight">
                {formatCurrency(lead.value, lead.currency)}
              </span>
              <span className="text-sm text-muted-foreground">{lead.probability}%</span>
            </div>
            <div className="space-y-1.5">
              <LabeledSelect
                label="Stage"
                value={lead.stage}
                disabled={moveStage.isPending}
                onChange={(stage) => moveStage.mutate(stage)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
              <CardDescription>Key information about this opportunity.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <DetailRow icon={Building2} label="Company" value={lead.company} />
              <DetailRow icon={UserRound} label="Contact" value={`${lead.contactName} (${lead.contactEmail})`} />
              <DetailRow icon={Phone} label="Phone" value={lead.contactPhone ?? "—"} />
              <DetailRow icon={CalendarDays} label="Expected close" value={formatLeadDate(lead.expectedClose)} />
              <DetailRow icon={UserRound} label="Owner" value={lead.owner ?? "—"} />
              <DetailRow icon={CheckCircle2} label="Probability" value={`${lead.probability}%`} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <StickyNote className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {lead.notes || "No notes yet for this lead."}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="relative space-y-4 border-l pl-4">
              {lead.activities.map((activity) => (
                <li key={activity.id} className="relative">
                  <span
                    className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary"
                    aria-hidden="true"
                  />
                  <p className="text-sm font-medium text-foreground">{activity.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {activity.actor ?? "System"} · {new Date(activity.time).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LabeledSelect({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: LeadStage;
  onChange: (stage: LeadStage) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={(next) => onChange(next as LeadStage)} disabled={disabled}>
        <SelectTrigger className="h-8 w-36" aria-label={`${label}: ${leadStageLabel(value)}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LEAD_STAGES.map(({ value: stage, label: stageLabelValue }) => (
            <SelectItem key={stage} value={stage}>
              {stageLabelValue}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
}) {
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
