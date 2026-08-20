import { Injectable } from "@nestjs/common";
import {
  type EsgBoardMember,
  type EsgMetric,
  type EsgMetricsListQuery,
  type EsgOverview,
  type EsgPolicy,
  type EsgReport,
} from "@amni/shared";

// DomainRecordRepository must remain a value import for Nest constructor metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { DomainRecordRepository } from "../common/domain-record.repository";
import type { GatewayRequestMeta, GatewayUser } from "../erp-gateway/erp-gateway.service";

@Injectable()
export class EsgService {
  constructor(private readonly records: DomainRecordRepository) {}

  async overview(user: GatewayUser, meta: GatewayRequestMeta): Promise<EsgOverview> {
    const [metrics, policies, board, reports] = await Promise.all([
      this.all<EsgMetric>(user, meta, "metric"),
      this.all<EsgPolicy>(user, meta, "policy"),
      this.all<EsgBoardMember>(user, meta, "board_member"),
      this.all<EsgReport>(user, meta, "report"),
    ]);
    const latestReport = reports.filter((report) => report.status === "published").sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0];
    const scores = latestReport?.pillarScore ?? { environmental: 0, social: 0, governance: 0, overall: 0 };
    const emissions = metrics.find((metric) => metric.name.toLowerCase().includes("emission"));
    const renewable = metrics.find((metric) => metric.name.toLowerCase().includes("renewable"));
    const turnover = metrics.find((metric) => metric.name.toLowerCase().includes("turnover"));
    const independent = board.filter((member) => member.independence === "independent").length;

    return {
      asOf: new Date().toISOString(),
      scores,
      kpis: [
        { id: "ghg_emissions", label: "GHG emissions", value: emissions?.value ?? 0, format: "number", hint: emissions ? `${emissions.unit}, ${emissions.period}` : "No emissions metric recorded" },
        { id: "renewable_share", label: "Renewable energy", value: renewable?.value ?? 0, format: "percent", hint: renewable?.period ?? "No renewable-energy metric recorded" },
        { id: "turnover", label: "Employee turnover", value: turnover?.value ?? 0, format: "percent", hint: turnover?.period ?? "No turnover metric recorded" },
        { id: "independence", label: "Independent board seats", value: independent, format: "number", hint: `of ${board.length} total` },
      ],
      carbonFootprint: emissions?.value ?? 0,
      employees: 0,
      boardSize: board.length,
      policiesActive: policies.filter((policy) => policy.status === "active").length,
      latestReport,
    };
  }

  async listMetrics(user: GatewayUser, meta: GatewayRequestMeta, query: EsgMetricsListQuery): Promise<EsgMetric[]> {
    const metrics = await this.all<EsgMetric>(user, meta, "metric");
    return metrics.filter((metric) => (!query.pillar || metric.pillar === query.pillar) && (!query.status || metric.status === query.status));
  }

  metricDetail(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<EsgMetric> {
    return this.records.get(user, meta, "esg", "metric", code);
  }

  async listPolicies(user: GatewayUser, meta: GatewayRequestMeta): Promise<EsgPolicy[]> {
    return this.all(user, meta, "policy");
  }

  policyDetail(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<EsgPolicy> {
    return this.records.get(user, meta, "esg", "policy", code);
  }

  async listBoard(user: GatewayUser, meta: GatewayRequestMeta): Promise<EsgBoardMember[]> {
    return this.all(user, meta, "board_member");
  }

  async listReports(user: GatewayUser, meta: GatewayRequestMeta): Promise<EsgReport[]> {
    const reports = await this.all<EsgReport>(user, meta, "report");
    return reports.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  }

  reportDetail(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<EsgReport> {
    return this.records.get(user, meta, "esg", "report", code);
  }

  private async all<T>(user: GatewayUser, meta: GatewayRequestMeta, recordType: string): Promise<T[]> {
    const result = await this.records.list<T>(user, meta, "esg", recordType, { pageLength: 100 });
    return result.items;
  }
}
