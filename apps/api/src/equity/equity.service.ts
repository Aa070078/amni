import { randomUUID } from "node:crypto";

import { Injectable } from "@nestjs/common";
import {
  type CapTableRow,
  type CreateRoundInput,
  type CreateShareClassInput,
  type CreateShareholderInput,
  type EquityOverview,
  type Round,
  type RoundListQuery,
  type RoundListResponse,
  type RoundStatus,
  type ShareClass,
  type ShareClassListQuery,
  type ShareClassListResponse,
  type ShareClassStatus,
  type Shareholder,
  type ShareholderListQuery,
  type ShareholderListResponse,
  type UpdateRoundInput,
  type UpdateShareClassInput,
  type UpdateShareholderInput,
} from "@amni/shared";

// DomainRecordRepository must remain a value import for Nest constructor metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { DomainRecordRepository } from "../common/domain-record.repository";
import type { GatewayRequestMeta, GatewayUser } from "../erp-gateway/erp-gateway.service";

const round2 = (value: number): number => Math.round(value * 100) / 100;

const newCode = (prefix: string): string => `${prefix}${randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;

function sortRecords<T>(records: T[], sortBy: string, sortDir: "asc" | "desc"): T[] {
  const direction = sortDir === "asc" ? 1 : -1;
  return [...records].sort((a, b) => {
    const left = a[sortBy as keyof T];
    const right = b[sortBy as keyof T];
    if (left === right) return 0;
    if (left == null) return 1;
    if (right == null) return -1;
    return left < right ? -direction : direction;
  });
}

function page<T>(items: T[], pageNumber: number, pageSize: number): { items: T[]; total: number } {
  const start = (pageNumber - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total: items.length };
}

@Injectable()
export class EquityService {
  constructor(private readonly records: DomainRecordRepository) {}

  async overview(user: GatewayUser, meta: GatewayRequestMeta): Promise<EquityOverview> {
    const [shareholders, classes, rounds] = await Promise.all([
      this.all<Shareholder>(user, meta, "shareholder"),
      this.all<ShareClass>(user, meta, "share_class"),
      this.all<Round>(user, meta, "round"),
    ]);
    const totalShares = shareholders.reduce((sum, item) => sum + item.totalShares, 0);
    const totalInvested = shareholders.reduce((sum, item) => sum + item.investedAmount, 0);
    const currentValuation = rounds.filter((item) => item.status === "closed").sort((a, b) => (b.closedDate ?? "").localeCompare(a.closedDate ?? ""))[0]?.postMoney ?? 0;
    const optionPool = classes.find((item) => item.name.toLowerCase().includes("option"));
    const investorCount = shareholders.filter((item) => item.type === "investor").length;
    return {
      asOf: new Date().toISOString(),
      kpis: [
        { id: "total_shares", label: "Total shares", value: totalShares, format: "number", hint: "across all classes" },
        { id: "total_invested", label: "Total invested", value: round2(totalInvested), format: "currency", currency: "USD", hint: "since inception" },
        { id: "valuation", label: "Post-money valuation", value: round2(currentValuation), format: "currency", currency: "USD", hint: "latest closed round" },
        { id: "investors", label: "Investors", value: investorCount, format: "number", hint: "institutional + angel" },
      ],
      totalShares,
      totalInvested: round2(totalInvested),
      currentValuation: round2(currentValuation),
      investorCount,
      optionPoolPct: optionPool && totalShares > 0 ? round2((optionPool.outstandingShares / totalShares) * 100) : 0,
      byClass: classes.map((item) => ({ className: item.name, shares: item.outstandingShares, pct: totalShares > 0 ? round2((item.outstandingShares / totalShares) * 100) : 0 })),
    };
  }

  async listShareholders(user: GatewayUser, meta: GatewayRequestMeta, query: ShareholderListQuery): Promise<ShareholderListResponse> {
    const q = (query.q ?? "").toLowerCase().trim();
    const records = (await this.all<Shareholder>(user, meta, "shareholder")).filter((item) => (!query.type || item.type === query.type) && (!q || `${item.code} ${item.name} ${item.email ?? ""}`.toLowerCase().includes(q)));
    const result = page(sortRecords(records, query.sortBy ?? "createdAt", query.sortDir ?? "asc"), query.page, query.pageSize);
    return { items: result.items, meta: { total: result.total, page: query.page, pageSize: query.pageSize } };
  }

  detailShareholder(user: GatewayUser, meta: GatewayRequestMeta, recordCode: string): Promise<Shareholder> {
    return this.records.get(user, meta, "equity", "shareholder", recordCode);
  }

  async createShareholder(user: GatewayUser, meta: GatewayRequestMeta, input: CreateShareholderInput): Promise<Shareholder> {
    const now = new Date().toISOString();
    const item: Shareholder = { code: newCode("SH-"), name: input.name, type: input.type, email: input.email, totalShares: input.holdings.reduce((sum, holding) => sum + holding.shares, 0), holdings: input.holdings, investedAmount: input.investedAmount ?? 0, joinedAt: input.joinedAt, createdAt: now, updatedAt: now };
    return this.records.create(user, meta, "equity", "shareholder", item.code, item, { title: item.name, category: item.type, numericValue: item.totalShares, eventAt: item.joinedAt, searchText: `${item.code} ${item.name} ${item.email ?? ""}` });
  }

  async updateShareholder(user: GatewayUser, meta: GatewayRequestMeta, recordCode: string, input: UpdateShareholderInput): Promise<Shareholder> {
    const item = await this.detailShareholder(user, meta, recordCode);
    Object.assign(item, input, { updatedAt: new Date().toISOString() });
    if (input.holdings) item.totalShares = input.holdings.reduce((sum, holding) => sum + holding.shares, 0);
    return this.records.update(user, meta, "equity", "shareholder", recordCode, item, { title: item.name, category: item.type, numericValue: item.totalShares, eventAt: item.joinedAt, searchText: `${item.code} ${item.name} ${item.email ?? ""}` });
  }

  removeShareholder(user: GatewayUser, meta: GatewayRequestMeta, recordCode: string): Promise<void> {
    return this.records.remove(user, meta, "equity", "shareholder", recordCode);
  }

  async listClasses(user: GatewayUser, meta: GatewayRequestMeta, query: ShareClassListQuery): Promise<ShareClassListResponse> {
    const q = (query.q ?? "").toLowerCase().trim();
    const records = (await this.all<ShareClass>(user, meta, "share_class")).filter((item) => (!query.status || item.status === query.status) && (!q || `${item.code} ${item.name}`.toLowerCase().includes(q)));
    const result = page(sortRecords(records, query.sortBy ?? "code", query.sortDir ?? "asc"), query.page, query.pageSize);
    return { items: result.items, meta: { total: result.total, page: query.page, pageSize: query.pageSize } };
  }

  detailClass(user: GatewayUser, meta: GatewayRequestMeta, recordCode: string): Promise<ShareClass> {
    return this.records.get(user, meta, "equity", "share_class", recordCode);
  }

  async createClass(user: GatewayUser, meta: GatewayRequestMeta, input: CreateShareClassInput): Promise<ShareClass> {
    const now = new Date().toISOString();
    const item: ShareClass = { code: newCode("CLS-"), name: input.name, totalShares: input.totalShares, outstandingShares: input.outstandingShares, pricePerShare: input.pricePerShare, voting: input.voting ?? true, liquidationPreference: input.liquidationPreference, status: "active", createdAt: now, updatedAt: now };
    return this.saveClass(user, meta, item, true);
  }

  async updateClass(user: GatewayUser, meta: GatewayRequestMeta, recordCode: string, input: UpdateShareClassInput): Promise<ShareClass> {
    const item = await this.detailClass(user, meta, recordCode);
    Object.assign(item, input, { updatedAt: new Date().toISOString() });
    return this.saveClass(user, meta, item, false);
  }

  async changeClassStatus(user: GatewayUser, meta: GatewayRequestMeta, recordCode: string, input: { status: ShareClassStatus }): Promise<ShareClass> {
    const item = await this.detailClass(user, meta, recordCode);
    item.status = input.status;
    item.updatedAt = new Date().toISOString();
    return this.saveClass(user, meta, item, false);
  }

  removeClass(user: GatewayUser, meta: GatewayRequestMeta, recordCode: string): Promise<void> {
    return this.records.remove(user, meta, "equity", "share_class", recordCode);
  }

  async listRounds(user: GatewayUser, meta: GatewayRequestMeta, query: RoundListQuery): Promise<RoundListResponse> {
    const q = (query.q ?? "").toLowerCase().trim();
    const records = (await this.all<Round>(user, meta, "round")).filter((item) => (!query.status || item.status === query.status) && (!q || `${item.code} ${item.name} ${item.investors.join(" ")}`.toLowerCase().includes(q)));
    const result = page(sortRecords(records, query.sortBy ?? "announcedDate", query.sortDir ?? "desc"), query.page, query.pageSize);
    return { items: result.items, meta: { total: result.total, page: query.page, pageSize: query.pageSize } };
  }

  detailRound(user: GatewayUser, meta: GatewayRequestMeta, recordCode: string): Promise<Round> {
    return this.records.get(user, meta, "equity", "round", recordCode);
  }

  async createRound(user: GatewayUser, meta: GatewayRequestMeta, input: CreateRoundInput): Promise<Round> {
    const now = new Date().toISOString();
    const item: Round = { code: newCode("RD-"), name: input.name, type: input.type, announcedDate: input.announcedDate ?? now, closedDate: input.closedDate, amountRaised: input.amountRaised, preMoney: input.preMoney, postMoney: input.postMoney, sharesIssued: input.sharesIssued, valuation: input.postMoney, investors: input.investors, status: input.closedDate ? "closed" : "announced", notes: input.notes, createdAt: now, updatedAt: now };
    return this.saveRound(user, meta, item, true);
  }

  async updateRound(user: GatewayUser, meta: GatewayRequestMeta, recordCode: string, input: UpdateRoundInput): Promise<Round> {
    const item = await this.detailRound(user, meta, recordCode);
    Object.assign(item, input, { updatedAt: new Date().toISOString() });
    if (input.postMoney !== undefined) item.valuation = input.postMoney;
    if (input.closedDate) item.status = "closed";
    return this.saveRound(user, meta, item, false);
  }

  async changeRoundStatus(user: GatewayUser, meta: GatewayRequestMeta, recordCode: string, input: { status: RoundStatus }): Promise<Round> {
    const item = await this.detailRound(user, meta, recordCode);
    item.status = input.status;
    if (input.status === "closed" && !item.closedDate) item.closedDate = new Date().toISOString();
    item.updatedAt = new Date().toISOString();
    return this.saveRound(user, meta, item, false);
  }

  removeRound(user: GatewayUser, meta: GatewayRequestMeta, recordCode: string): Promise<void> {
    return this.records.remove(user, meta, "equity", "round", recordCode);
  }

  async capTable(user: GatewayUser, meta: GatewayRequestMeta): Promise<CapTableRow[]> {
    const [shareholders, classes] = await Promise.all([this.all<Shareholder>(user, meta, "shareholder"), this.all<ShareClass>(user, meta, "share_class")]);
    const totalShares = shareholders.reduce((sum, item) => sum + item.totalShares, 0) || 1;
    return shareholders.flatMap((shareholder) => shareholder.holdings.map((holding) => ({ shareholderCode: shareholder.code, name: shareholder.name, type: shareholder.type, classCode: holding.classCode, className: classes.find((item) => item.code === holding.classCode)?.name ?? holding.classCode, shares: holding.shares, ownershipPct: round2((holding.shares / totalShares) * 100), investedAmount: shareholder.investedAmount }))).sort((a, b) => b.shares - a.shares);
  }

  private async all<T>(user: GatewayUser, meta: GatewayRequestMeta, recordType: string): Promise<T[]> {
    return (await this.records.list<T>(user, meta, "equity", recordType, { pageLength: 100 })).items;
  }

  private saveClass(user: GatewayUser, meta: GatewayRequestMeta, item: ShareClass, create: boolean): Promise<ShareClass> {
    const indexes = { title: item.name, status: item.status, numericValue: item.outstandingShares, searchText: `${item.code} ${item.name}` };
    return create ? this.records.create(user, meta, "equity", "share_class", item.code, item, indexes) : this.records.update(user, meta, "equity", "share_class", item.code, item, indexes);
  }

  private saveRound(user: GatewayUser, meta: GatewayRequestMeta, item: Round, create: boolean): Promise<Round> {
    const indexes = { title: item.name, status: item.status, category: item.type, eventAt: item.announcedDate, numericValue: item.amountRaised, searchText: `${item.code} ${item.name} ${item.investors.join(" ")}` };
    return create ? this.records.create(user, meta, "equity", "round", item.code, item, indexes) : this.records.update(user, meta, "equity", "round", item.code, item, indexes);
  }
}
