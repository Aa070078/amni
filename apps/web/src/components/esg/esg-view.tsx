"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileBarChart, FileText, Gauge, Leaf, ScrollText, ShieldCheck, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Progress,
} from "@amni/ui";
import { formatNumber } from "@/src/lib/format";
import { esgClient } from "@/src/lib/esg";
import { PanelEmpty, PanelError } from "@/src/components/dashboard/panel-utils";
import {
  BoardMemberIndependenceBadge,
  EsgMetricStatusBadge,
  EsgPillarBadge,
  EsgPolicyStatusBadge,
  EsgReportStatusBadge,
} from "./esg-status";

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums text-foreground">{value.toFixed(1)}/100</span>
      </div>
      <Progress value={value} aria-label={`${label} score`} />
    </div>
  );
}

export function EsgView() {
  const overviewQuery = useQuery({
    queryKey: ["esg", "overview"],
    queryFn: () => esgClient.overview(),
  });

  const metricsQuery = useQuery({
    queryKey: ["esg", "metrics"],
    queryFn: () => esgClient.listMetrics({}),
    placeholderData: (previous) => previous,
  });

  const policiesQuery = useQuery({
    queryKey: ["esg", "policies"],
    queryFn: () => esgClient.listPolicies(),
    placeholderData: (previous) => previous,
  });

  const boardQuery = useQuery({
    queryKey: ["esg", "board"],
    queryFn: () => esgClient.listBoard(),
    placeholderData: (previous) => previous,
  });

  const reportsQuery = useQuery({
    queryKey: ["esg", "reports"],
    queryFn: () => esgClient.listReports(),
    placeholderData: (previous) => previous,
  });

  const metrics = metricsQuery.data;
  const policies = policiesQuery.data;
  const board = boardQuery.data;
  const reports = reportsQuery.data;

  const loading =
    overviewQuery.isLoading || metricsQuery.isLoading || policiesQuery.isLoading || boardQuery.isLoading || reportsQuery.isLoading;

  return (
    <div className="space-y-6">
      <Link
        href="/finance"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Finance
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">ESG</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Environmental, social, and governance performance across your workspace.
        </p>
      </div>

      {overviewQuery.isError || metricsQuery.isError || policiesQuery.isError || boardQuery.isError || reportsQuery.isError ? (
        <Card>
          <CardContent className="p-6">
            <PanelError
              onRetry={() => {
                void overviewQuery.refetch();
                void metricsQuery.refetch();
                void policiesQuery.refetch();
                void boardQuery.refetch();
                void reportsQuery.refetch();
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
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Leaf className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    Scores
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ScoreBar label="Environmental" value={overviewQuery.data.scores.environmental} />
                  <ScoreBar label="Social" value={overviewQuery.data.scores.social} />
                  <ScoreBar label="Governance" value={overviewQuery.data.scores.governance} />
                  <ScoreBar label="Overall" value={overviewQuery.data.scores.overall} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    At a glance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <GlanceValue label="Carbon footprint" value={`${formatNumber(overviewQuery.data.carbonFootprint)} tCO₂e`} />
                  <GlanceValue label="Employees" value={formatNumber(overviewQuery.data.employees)} />
                  <GlanceValue label="Board size" value={formatNumber(overviewQuery.data.boardSize)} />
                  <GlanceValue label="Active policies" value={formatNumber(overviewQuery.data.policiesActive)} />
                  {overviewQuery.data.latestReport ? (
                    <div className="rounded-md border px-3 py-2">
                      <p className="text-xs font-medium text-muted-foreground">Latest report</p>
                      <Link
                        href={`/finance/esg/reports/${overviewQuery.data.latestReport.code}`}
                        className="mt-0.5 inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary hover:underline"
                      >
                        <FileBarChart className="h-3.5 w-3.5" aria-hidden="true" />
                        {overviewQuery.data.latestReport.code} · {overviewQuery.data.latestReport.period}
                      </Link>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          ) : null}

          <Tabs defaultValue="metrics">
            <TabsList aria-label="ESG sections">
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="policies">Policies</TabsTrigger>
              <TabsTrigger value="board">Board</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>

            <TabsContent value="metrics" className="space-y-4">
              {!metrics || metrics.length === 0 ? (
                <Card>
                  <CardContent className="p-6">
                    <PanelEmpty
                      icon={Gauge}
                      title="No ESG metrics yet"
                      description="Tracked indicators will appear here."
                    />
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Metric</TableHead>
                          <TableHead>Pillar</TableHead>
                          <TableHead className="w-32 text-right">Value</TableHead>
                          <TableHead className="w-32 text-right">Target</TableHead>
                          <TableHead>Period</TableHead>
                          <TableHead className="w-32">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {metrics.map((metric) => (
                          <TableRow key={metric.code}>
                            <TableCell>
                              <p className="font-medium text-foreground">{metric.name}</p>
                              <p className="text-xs tabular-nums text-muted-foreground">{metric.code}</p>
                            </TableCell>
                            <TableCell>
                              <EsgPillarBadge pillar={metric.pillar} />
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-foreground">
                              {formatNumber(metric.value)} {metric.unit}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {metric.target !== undefined && metric.target !== null
                                ? `${formatNumber(metric.target)} ${metric.unit}`
                                : "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{metric.period}</TableCell>
                            <TableCell>
                              <EsgMetricStatusBadge status={metric.status} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="policies" className="space-y-4">
              {!policies || policies.length === 0 ? (
                <Card>
                  <CardContent className="p-6">
                    <PanelEmpty
                      icon={ScrollText}
                      title="No policies yet"
                      description="Governance and sustainability policies will appear here."
                    />
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Policy</TableHead>
                          <TableHead className="w-36">Status</TableHead>
                          <TableHead className="w-40">Last reviewed</TableHead>
                          <TableHead className="w-40">Next review</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {policies.map((policy) => (
                          <TableRow key={policy.code}>
                            <TableCell>
                              <Link
                                href={`/finance/esg/policies/${policy.code}`}
                                className="font-medium text-foreground hover:text-primary hover:underline"
                              >
                                {policy.name}
                              </Link>
                              <p className="text-xs tabular-nums text-muted-foreground">{policy.code}</p>
                            </TableCell>
                            <TableCell>
                              <EsgPolicyStatusBadge status={policy.status} />
                            </TableCell>
                            <TableCell className="tabular-nums text-muted-foreground">
                              {policy.lastReviewed ? new Date(policy.lastReviewed).toLocaleDateString() : "—"}
                            </TableCell>
                            <TableCell className="tabular-nums text-muted-foreground">
                              {policy.nextReview ? new Date(policy.nextReview).toLocaleDateString() : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="board" className="space-y-4">
              {!board || board.length === 0 ? (
                <Card>
                  <CardContent className="p-6">
                    <PanelEmpty
                      icon={Users}
                      title="No board members yet"
                      description="Board composition will appear here."
                    />
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Member</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead className="w-36">Independence</TableHead>
                          <TableHead className="w-32">Since</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {board.map((member) => (
                          <TableRow key={member.code}>
                            <TableCell>
                              <Link
                                href={`/finance/esg/board/${member.code}`}
                                className="font-medium text-foreground hover:text-primary hover:underline"
                              >
                                {member.name}
                              </Link>
                              <p className="text-xs tabular-nums text-muted-foreground">{member.code}</p>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{member.role}</TableCell>
                            <TableCell>
                              <BoardMemberIndependenceBadge independence={member.independence} />
                            </TableCell>
                            <TableCell className="tabular-nums text-muted-foreground">{member.since}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="reports" className="space-y-4">
              {!reports || reports.length === 0 ? (
                <Card>
                  <CardContent className="p-6">
                    <PanelEmpty
                      icon={FileText}
                      title="No reports yet"
                      description="Generated ESG reports will appear here."
                    />
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Report</TableHead>
                          <TableHead>Period</TableHead>
                          <TableHead className="w-32">Overall</TableHead>
                          <TableHead className="w-28">Status</TableHead>
                          <TableHead className="w-40">Generated</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reports.map((report) => (
                          <TableRow key={report.code}>
                            <TableCell>
                              <Link
                                href={`/finance/esg/reports/${report.code}`}
                                className="font-medium tabular-nums text-foreground hover:text-primary hover:underline"
                              >
                                {report.code}
                              </Link>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{report.period}</TableCell>
                            <TableCell className="font-medium tabular-nums text-foreground">
                              {report.pillarScore.overall.toFixed(1)}
                            </TableCell>
                            <TableCell>
                              <EsgReportStatusBadge status={report.status} />
                            </TableCell>
                            <TableCell className="tabular-nums text-muted-foreground">
                              {new Date(report.generatedAt).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function GlanceValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  );
}
