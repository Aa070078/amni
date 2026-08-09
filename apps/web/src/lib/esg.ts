import type {
  EsgBoardMember,
  EsgMetric,
  EsgMetricsListQuery,
  EsgOverview,
  EsgPolicy,
  EsgReport,
} from "@amni/shared";
import { apiRequest, toQueryString } from "./client";

export const esgClient = {
  overview(): Promise<EsgOverview> {
    return apiRequest<EsgOverview>("/esg", "/overview");
  },
  listMetrics(query: Partial<EsgMetricsListQuery> = {}): Promise<EsgMetric[]> {
    const { pillar, status } = query;
    return apiRequest<EsgMetric[]>("/esg", `/metrics${toQueryString({ pillar, status })}`);
  },
  metricDetail(code: string): Promise<EsgMetric> {
    return apiRequest<EsgMetric>("/esg", `/metrics/${encodeURIComponent(code)}`);
  },
  listPolicies(): Promise<EsgPolicy[]> {
    return apiRequest<EsgPolicy[]>("/esg", "/policies");
  },
  policyDetail(code: string): Promise<EsgPolicy> {
    return apiRequest<EsgPolicy>("/esg", `/policies/${encodeURIComponent(code)}`);
  },
  listBoard(): Promise<EsgBoardMember[]> {
    return apiRequest<EsgBoardMember[]>("/esg", "/board");
  },
  listReports(): Promise<EsgReport[]> {
    return apiRequest<EsgReport[]>("/esg", "/reports");
  },
  reportDetail(code: string): Promise<EsgReport> {
    return apiRequest<EsgReport>("/esg", `/reports/${encodeURIComponent(code)}`);
  },
};
