import { Injectable } from "@nestjs/common";
import {
  ErrorCode,
  type EsgBoardMember,
  type EsgMetric,
  type EsgMetricsListQuery,
  type EsgOverview,
  type EsgPolicy,
  type EsgReport,
} from "@amni/shared";

import { ApiException } from "../common/api.exception";

const DAY_MS = 86_400_000;
const iso = (daysAgo: number): string => new Date(Date.now() - daysAgo * DAY_MS).toISOString();
const isoAhead = (days: number): string => new Date(Date.now() + days * DAY_MS).toISOString();

const SEED_METRICS: EsgMetric[] = [
  { code: "ESG-M01", pillar: "environmental", name: "Scope 1 & 2 GHG emissions", value: 182, unit: "tCO2e", period: "2026 Q2", target: 210, status: "on_track", trend: "down" },
  { code: "ESG-M02", pillar: "environmental", name: "Renewable energy share", value: 46, unit: "%", period: "2026 Q2", target: 50, status: "behind", trend: "up" },
  { code: "ESG-M03", pillar: "environmental", name: "Water consumption", value: 2400, unit: "m3", period: "2026 Q2", target: 2800, status: "on_track", trend: "flat" },
  { code: "ESG-M04", pillar: "social", name: "Employee turnover (annualized)", value: 12, unit: "%", period: "2026 H1", target: 15, status: "on_track", trend: "down" },
  { code: "ESG-M05", pillar: "social", name: "Lost-time safety incidents", value: 2, unit: "count", period: "2026 H1", target: 3, status: "on_track", trend: "flat" },
  { code: "ESG-M06", pillar: "governance", name: "Independent board seats", value: 4, unit: "seats", period: "2026", target: 4, status: "on_track", trend: "flat" },
];

const SEED_POLICIES: EsgPolicy[] = [
  { code: "POL-0001", name: "Data protection policy", status: "active", lastReviewed: iso(60), nextReview: isoAhead(305) },
  { code: "POL-0002", name: "Anti-bribery and corruption", status: "active", lastReviewed: iso(30), nextReview: isoAhead(335) },
  { code: "POL-0003", name: "Whistleblowing policy", status: "under_review", lastReviewed: iso(15) },
  { code: "POL-0004", name: "Supplier code of conduct", status: "draft" },
];

const SEED_BOARD: EsgBoardMember[] = [
  { code: "BRD-0001", name: "Amara Osei", role: "CFO", independence: "executive", since: "2021" },
  { code: "BRD-0002", name: "Dr. Lena Fischer", role: "Non-executive Director", independence: "non_executive", since: "2022" },
  { code: "BRD-0003", name: "Marcus Chen", role: "Independent Director", independence: "independent", since: "2023" },
  { code: "BRD-0004", name: "Priya Nair", role: "Independent Director", independence: "independent", since: "2024" },
];

const SEED_REPORTS: EsgReport[] = [
  {
    code: "ESG-0001",
    period: "FY 2025",
    status: "published",
    pillarScore: { environmental: 72, social: 78, governance: 85, overall: 78 },
    highlights: [
      "Reduced Scope 1 & 2 emissions by 11% year over year.",
      "Launched a company-wide mental health programme.",
      "Board composition now 50% independent directors.",
    ],
    generatedAt: iso(120),
  },
  {
    code: "ESG-0002",
    period: "H1 2026",
    status: "draft",
    pillarScore: { environmental: 74, social: 79, governance: 86, overall: 79 },
    highlights: [
      "On track for the 2026 renewable energy target.",
      "Zero lost-time incidents in Q2.",
    ],
    generatedAt: iso(5),
  },
];

/**
 * Reference data for the Demo Co tenant. Read-only sustainability surface;
 * metrics, policies, board and report history until an ESG data pipeline lands.
 */
@Injectable()
export class EsgService {
  private metrics: EsgMetric[] = structuredClone(SEED_METRICS);
  private policies: EsgPolicy[] = structuredClone(SEED_POLICIES);
  private board: EsgBoardMember[] = structuredClone(SEED_BOARD);
  private reports: EsgReport[] = structuredClone(SEED_REPORTS);

  overview(): EsgOverview {
    const published = this.reports.filter((report) => report.status === "published");
    const latestReport = published.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0];

    return {
      asOf: new Date().toISOString(),
      scores: { environmental: 74, social: 79, governance: 86, overall: 79 },
      kpis: [
        { id: "ghg_emissions", label: "GHG emissions (annual)", value: 182, format: "number", delta: -11, trend: "down", hint: "182 tCO2e, vs. prior year" },
        { id: "renewable_share", label: "Renewable energy", value: 46, format: "percent", delta: 6, trend: "up", hint: "of total usage" },
        { id: "turnover", label: "Employee turnover", value: 12, format: "percent", delta: -2, trend: "down", hint: "annualized" },
        { id: "independence", label: "Independent board seats", value: 2, format: "number", hint: "of 4 total" },
      ],
      carbonFootprint: 182,
      employees: 64,
      boardSize: 4,
      policiesActive: this.policies.filter((policy) => policy.status === "active").length,
      latestReport,
    };
  }

  listMetrics(query: EsgMetricsListQuery): EsgMetric[] {
    return this.metrics.filter((metric) => {
      if (query.pillar && metric.pillar !== query.pillar) return false;
      if (query.status && metric.status !== query.status) return false;
      return true;
    });
  }

  metricDetail(code: string): EsgMetric {
    const metric = this.metrics.find((record) => record.code === code);
    if (!metric) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `ESG metric ${code} not found` });
    }
    return metric;
  }

  listPolicies(): EsgPolicy[] {
    return this.policies;
  }

  policyDetail(code: string): EsgPolicy {
    const policy = this.policies.find((record) => record.code === code);
    if (!policy) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `ESG policy ${code} not found` });
    }
    return policy;
  }

  listBoard(): EsgBoardMember[] {
    return this.board;
  }

  listReports(): EsgReport[] {
    return [...this.reports].sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  }

  reportDetail(code: string): EsgReport {
    const report = this.reports.find((record) => record.code === code);
    if (!report) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `ESG report ${code} not found` });
    }
    return report;
  }
}
