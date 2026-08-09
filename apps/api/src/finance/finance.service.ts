import { Injectable } from "@nestjs/common";
import type {
  FinanceArBucket,
  FinanceOverview,
  FinanceSeriesPoint,
  FinancialReport,
  ReportRow,
  ReportType,
} from "@amni/shared";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const KPI_CUR = { format: "currency" as const, currency: "USD" as const };

/**
 * Reference data for the Demo Co tenant. This module is the only finance
 * surface until the ERP gateway lands (M5); endpoints then compute from the
 * tenant ERPNext site and keep the same contract.
 */
@Injectable()
export class FinanceService {
  overview(): FinanceOverview {
    return {
      asOf: new Date().toISOString(),
      kpis: [
        { id: "revenue", label: "Revenue", value: 284_500, ...KPI_CUR, delta: 12.4, trend: "up", hint: "Invoiced this month", sparkline: [232_000, 241_000, 238_500, 249_800, 255_200, 263_400, 258_900, 271_300, 268_400, 276_200, 279_800, 284_500] },
        { id: "ar", label: "Accounts receivable", value: 96_250, ...KPI_CUR, delta: 3.1, trend: "up", hint: "12 invoices outstanding", sparkline: [84_100, 86_400, 85_200, 88_300, 87_100, 89_600, 91_200, 90_400, 92_800, 93_500, 95_100, 96_250] },
        { id: "ap", label: "Accounts payable", value: 41_800, ...KPI_CUR, delta: -1.8, trend: "down", hint: "9 bills due this month", sparkline: [48_200, 47_100, 47_800, 46_500, 46_900, 45_800, 46_100, 44_900, 45_200, 43_800, 42_900, 41_800] },
        { id: "cash", label: "Cash balance", value: 512_400, ...KPI_CUR, delta: 4.2, trend: "up", hint: "Across 3 bank accounts", sparkline: [438_000, 452_300, 447_800, 461_200, 473_900, 468_500, 481_400, 489_200, 496_100, 503_800, 508_600, 512_400] },
      ],
      revenueTrend: series([95_000, 108_000, 121_000, 118_000, 134_000, 147_000, 155_000, 168_000, 176_000, 192_000, 205_000, 221_000]),
      cashTrend: series([421_000, 434_000, 429_000, 452_000, 468_000, 461_000, 477_000, 489_000, 496_000, 503_000, 509_000, 512_400]),
      expensesTrend: series([61_000, 58_000, 64_000, 59_000, 66_000, 62_000, 69_000, 65_000, 71_000, 68_000, 74_000, 70_000]),
      arAging: aging(["Current", "1–30", "31–60", "61–90", "90+"]),
      apAging: aging(["Current", "1–30", "31–60", "61–90", "90+"]),
      monthlyTotals: months.map((month, index) => ({
        month,
        revenue: 200_000 + index * 2_100,
        expenses: 58_000 + index * 900,
        profit: 142_000 + index * 1_200,
      })),
    };
  }

  report(type: ReportType): FinancialReport {
    const rowsByType: Record<ReportType, ReportRow[]> = {
      income_statement: [
        { account: "Sales revenue", amount: 284_500 },
        { account: "Cost of goods sold", amount: -161_200 },
        { account: "Gross profit", amount: 123_300 },
        { account: "Operating expenses", amount: -82_400 },
        { account: "Operating income", amount: 40_900 },
        { account: "Other income", amount: 1_800 },
        { account: "Net income", amount: 42_700 },
      ],
      balance_sheet: [
        { account: "Current assets", amount: 612_400 },
        { account: "Fixed assets", amount: 284_200 },
        { account: "Total assets", amount: 896_600 },
        { account: "Current liabilities", amount: 71_400 },
        { account: "Long-term liabilities", amount: 128_000 },
        { account: "Owner's equity", amount: 697_200 },
        { account: "Total liabilities & equity", amount: 896_600 },
      ],
      cash_flow: [
        { account: "Net income", amount: 42_700 },
        { account: "Depreciation & amortisation", amount: 18_400 },
        { account: "Working capital changes", amount: -6_200 },
        { account: "Cash from operations", amount: 54_900 },
        { account: "Capital expenditure", amount: -22_500 },
        { account: "Cash from investing", amount: -22_500 },
        { account: "Financing activities", amount: -8_100 },
        { account: "Net cash flow", amount: 24_300 },
      ],
      ar_aging: [
        { account: "Current", amount: 48_200 },
        { account: "1–30 days", amount: 22_800 },
        { account: "31–60 days", amount: 12_500 },
        { account: "61–90 days", amount: 7_100 },
        { account: "90+ days", amount: 5_650 },
        { account: "Total receivables", amount: 96_250 },
      ],
      ap_aging: [
        { account: "Current", amount: 19_400 },
        { account: "1–30 days", amount: 11_200 },
        { account: "31–60 days", amount: 6_300 },
        { account: "61–90 days", amount: 3_100 },
        { account: "90+ days", amount: 1_800 },
        { account: "Total payables", amount: 41_800 },
      ],
    };

    const titles: Record<ReportType, string> = {
      income_statement: "Income statement",
      balance_sheet: "Balance sheet",
      cash_flow: "Cash flow statement",
      ar_aging: "Accounts receivable aging",
      ap_aging: "Accounts payable aging",
    };

    const rows = rowsByType[type];
    return {
      title: titles[type],
      period: "Last 12 months",
      currency: "USD",
      rows,
      total: rows.reduce((sum, row) => sum + row.amount, 0),
      generatedAt: new Date().toISOString(),
    };
  }
}

function series(values: number[]): FinanceSeriesPoint[] {
  return months.map((label, index) => ({ label, value: values[index] ?? 0 }));
}

function aging(labels: string[]): FinanceArBucket[] {
  return labels.map((label, index) => ({ label, value: 30_000 - index * 4_200 }));
}
