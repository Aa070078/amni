"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRightLeft,
  CalendarDays,
  CheckSquare,
  Info,
  Loader2,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  Send,
  StickyNote,
  type LucideIcon,
} from "lucide-react";
import type { CrmActivityKind, CrmReferenceType } from "@amni/shared";
import { Button, cn, Input, Skeleton } from "@amni/ui";
import { crmClient, formatCrmDateTime } from "@/src/lib/crm";
import { formatRelativeTime } from "@/src/lib/format";
import { CrmReferenceChip } from "./crm-badges";

const KIND_META: Record<CrmActivityKind, { icon: LucideIcon; tone: string }> = {
  comment: { icon: MessageSquare, tone: "bg-primary/10 text-primary" },
  note: { icon: StickyNote, tone: "bg-warning/10 text-warning-foreground" },
  call: { icon: Phone, tone: "bg-success/10 text-success" },
  whatsapp: { icon: MessageCircle, tone: "bg-success/10 text-success" },
  email: { icon: Mail, tone: "bg-muted text-muted-foreground" },
  status_change: { icon: ArrowRightLeft, tone: "bg-muted text-muted-foreground" },
  task: { icon: CheckSquare, tone: "bg-primary/10 text-primary" },
  event: { icon: CalendarDays, tone: "bg-warning/10 text-warning-foreground" },
  system: { icon: Info, tone: "bg-muted text-muted-foreground" },
};

export function formatCrmKind(kind: CrmActivityKind): string {
  return kind.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

interface ActivityTimelineProps {
  referenceType: CrmReferenceType;
  referenceCode: string;
}

export function ActivityTimeline({ referenceType, referenceCode }: ActivityTimelineProps) {
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [mention, setMention] = useState("");

  const queryKey = ["crm", "activities", referenceType, referenceCode] as const;

  const activitiesQuery = useQuery({
    queryKey,
    queryFn: () => crmClient.activities.list({ referenceType, referenceCode, limit: 50 }),
  });

  const addComment = useMutation({
    mutationFn: () =>
      crmClient.activities.comment({
        referenceType,
        referenceCode,
        content: comment,
        mentions: mention.trim() ? [mention.trim()] : [],
        attachments: [],
      }),
    onSuccess: () => {
      setComment("");
      setMention("");
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  return (
    <div className="space-y-4">
      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (comment.trim()) addComment.mutate();
        }}
        noValidate
      >
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          rows={2}
          placeholder="Write a comment…"
          aria-label="Add a comment"
          className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div className="flex items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Mention someone
            <Input
              value={mention}
              onChange={(event) => setMention(event.target.value)}
              placeholder="@Name"
              aria-label="Mention someone"
              className="h-7 w-36 text-xs"
            />
          </label>
          <Button type="submit" size="sm" disabled={addComment.isPending || !comment.trim()}>
            {addComment.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            Comment
          </Button>
        </div>
      </form>

      {activitiesQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-12 rounded-md" />
          ))}
        </div>
      ) : activitiesQuery.isError ? (
        <p className="text-sm text-muted-foreground">
          Couldn&apos;t load activity.{" "}
          <button className="text-primary underline" onClick={() => void activitiesQuery.refetch()}>
            Retry
          </button>
        </p>
      ) : activitiesQuery.data?.items.length === 0 ? (
        <p className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
          No activity yet. Comment above to get things moving.
        </p>
      ) : (
        <ol className="relative space-y-3 border-l pl-4">
          {(activitiesQuery.data?.items ?? []).map((activity) => {
            const meta = KIND_META[activity.kind];
            const Icon = meta.icon;
            return (
              <li key={activity.id} className="relative space-y-1">
                <span
                  className={cn("absolute -left-[19px] top-1 flex h-6 w-6 items-center justify-center rounded-full", meta.tone)}
                  aria-hidden="true"
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{activity.author ?? "System"}</span>
                  <span>{formatCrmKind(activity.kind)}</span>
                  <span>{formatRelativeTime(activity.createdAt)}</span>
                </div>
                {activity.content ? (
                  <p className="whitespace-pre-wrap text-sm text-foreground">{activity.content}</p>
                ) : null}
                {activity.referenceType && activity.referenceCode ? (
                  <div className="flex items-center gap-1 text-xs">
                    <CrmReferenceChip
                      referenceType={activity.referenceType}
                      referenceCode={activity.referenceCode}
                    />
                    <span className="text-muted-foreground">{formatCrmDateTime(activity.createdAt)}</span>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
