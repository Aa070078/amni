import type { FinanceOverview, FinancialReport, ReportType } from "@amni/shared";
import { apiRequest } from "./client";

export const financeClient = {
  overview(): Promise<FinanceOverview> {
    return apiRequest<FinanceOverview>("/finance", "/overview");
  },
  report(type: ReportType): Promise<FinancialReport> {
    return apiRequest<FinancialReport>("/finance", `/reports/${encodeURIComponent(type)}`);
  },
};
