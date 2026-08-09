"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, UserRound } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from "@amni/ui";
import { AmniApiError } from "@/src/lib/client";
import { esgClient } from "@/src/lib/esg";
import { BoardMemberIndependenceBadge } from "./esg-status";

interface EsgBoardMemberDetailViewProps {
  code: string;
}

export function EsgBoardMemberDetailView({ code }: EsgBoardMemberDetailViewProps) {
  const detailQuery = useQuery({
    queryKey: ["esg", "board", code],
    queryFn: () => esgClient.listBoard(),
    select: (members) => members.find((member) => member.code === code),
    retry: (failureCount, error) => {
      if (error instanceof AmniApiError && error.status === 404) return false;
      return failureCount < 2;
    },
  });

  if (detailQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
    );
  }

  const member = detailQuery.data;

  if (detailQuery.isError || !member) {
    const is404 = detailQuery.error instanceof AmniApiError && detailQuery.error.status === 404;
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
          <UserRound className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-base font-semibold">
              {is404 ? "Board member not found" : "Couldn&apos;t load this board member"}
            </p>
            <p className="text-sm text-muted-foreground">
              {is404
                ? `No board member matches ${code}. They may have been removed.`
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
              <Link href="/finance/esg">
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Back to ESG
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/finance/esg"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        ESG
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{member.name}</h1>
              <BoardMemberIndependenceBadge independence={member.independence} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{member.code}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserRound className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Details
          </CardTitle>
          <CardDescription>Role and tenure on the board.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DetailRow icon={UserRound} label="Role" value={member.role} />
          <DetailRow
            icon={CalendarDays}
            label="Since"
            value={member.since}
          />
          <DetailRow
            icon={CalendarDays}
            label="Independence"
            value={
              member.independence === "executive"
                ? "Executive"
                : member.independence === "non_executive"
                  ? "Non-executive"
                  : "Independent"
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
}
