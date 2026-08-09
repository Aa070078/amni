import { Injectable } from "@nestjs/common";
import {
  ErrorCode,
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

import { ApiException } from "../common/api.exception";

const DAY_MS = 86_400_000;
const iso = (daysAgo: number): string => new Date(Date.now() - daysAgo * DAY_MS).toISOString();
const round2 = (value: number): number => Math.round(value * 100) / 100;

const SEED_SHAREHOLDERS: Shareholder[] = [
  { code: "SH-0001", name: "Amara Osei", type: "founder", email: "amara@demo.co", totalShares: 25000, holdings: [{ classCode: "CLS-0001", shares: 25000 }], investedAmount: 10000, joinedAt: iso(420), createdAt: iso(420), updatedAt: iso(30) },
  { code: "SH-0002", name: "Theo Lindqvist", type: "founder", email: "theo@demo.co", totalShares: 15000, holdings: [{ classCode: "CLS-0001", shares: 15000 }], investedAmount: 5000, joinedAt: iso(420), createdAt: iso(420), updatedAt: iso(30) },
  { code: "SH-0003", name: "Meridian Ventures", type: "investor", email: "funds@meridian.vc", totalShares: 8000, holdings: [{ classCode: "CLS-0002", shares: 8000 }], investedAmount: 200000, joinedAt: iso(120), createdAt: iso(122), updatedAt: iso(120) },
  { code: "SH-0004", name: "Osei Family Trust", type: "other", totalShares: 2000, holdings: [{ classCode: "CLS-0003", shares: 2000 }], investedAmount: 0, joinedAt: iso(80), createdAt: iso(82), updatedAt: iso(80) },
];

const SEED_CLASSES: ShareClass[] = [
  { code: "CLS-0001", name: "Common stock", totalShares: 40000, outstandingShares: 40000, pricePerShare: 1, voting: true, status: "active", createdAt: iso(420), updatedAt: iso(30) },
  { code: "CLS-0002", name: "Series Seed preferred", totalShares: 8000, outstandingShares: 8000, pricePerShare: 25, voting: true, liquidationPreference: 1, status: "active", createdAt: iso(120), updatedAt: iso(120) },
  { code: "CLS-0003", name: "Option pool", totalShares: 2000, outstandingShares: 2000, pricePerShare: 0.5, voting: false, status: "active", createdAt: iso(90), updatedAt: iso(90) },
];

const SEED_ROUNDS: Round[] = [
  {
    code: "RD-0001",
    name: "Seed round",
    type: "seed",
    announcedDate: iso(130),
    closedDate: iso(120),
    amountRaised: 200000,
    preMoney: 900000,
    postMoney: 1100000,
    sharesIssued: 8000,
    valuation: 1100000,
    investors: ["Meridian Ventures"],
    status: "closed",
    notes: "Priced round; Meridian Ventures led.",
    createdAt: iso(132),
    updatedAt: iso(120),
  },
  {
    code: "RD-0002",
    name: "Series A — planning",
    type: "series_a",
    announcedDate: iso(10),
    amountRaised: 0,
    preMoney: 0,
    postMoney: 0,
    sharesIssued: 0,
    valuation: 0,
    investors: [],
    status: "planned",
    notes: "Target announced; terms under discussion.",
    createdAt: iso(12),
    updatedAt: iso(10),
  },
];

function nextCode(records: { code: string }[], prefix: string): string {
  const max = records.reduce((highest, record) => {
    const number = Number(record.code.slice(prefix.length));
    return number > highest ? number : highest;
  }, 0);
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

function sortValue<T>(record: T, sortBy: string): unknown {
  return record[sortBy as keyof T];
}

function sortRecords<T>(records: T[], sortBy: string, sortDir: "asc" | "desc"): T[] {
  const direction = sortDir === "asc" ? 1 : -1;
  return [...records].sort((a, b) => {
    const aValue = sortValue(a, sortBy);
    const bValue = sortValue(b, sortBy);
    if (aValue === bValue) return 0;
    if (aValue == null) return 1;
    if (bValue == null) return -1;
    return aValue < bValue ? -1 * direction : direction;
  });
}

function paginate<T>(items: T[], page: number, pageSize: number): { items: T[]; total: number } {
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total: items.length };
}

/**
 * Reference data for the Demo Co tenant. The cap table is derived from
 * shareholder holdings against the share-class registry.
 */
@Injectable()
export class EquityService {
  private shareholders: Shareholder[] = structuredClone(SEED_SHAREHOLDERS);
  private classes: ShareClass[] = structuredClone(SEED_CLASSES);
  private rounds: Round[] = structuredClone(SEED_ROUNDS);

  overview(): EquityOverview {
    const totalShares = this.shareholders.reduce((sum, shareholder) => sum + shareholder.totalShares, 0);
    const totalInvested = this.shareholders.reduce((sum, shareholder) => sum + shareholder.investedAmount, 0);
    const currentValuation = this.rounds
      .filter((round) => round.status === "closed")
      .sort((a, b) => b.closedDate!.localeCompare(a.closedDate!))[0]?.postMoney ?? 0;
    const optionPool = this.classes.find((entry) => entry.name.toLowerCase().includes("option")) ?? this.classes.find((entry) => entry.code === "CLS-0003");

    return {
      asOf: new Date().toISOString(),
      kpis: [
        { id: "total_shares", label: "Total shares", value: totalShares, format: "number", hint: "across all classes" },
        { id: "total_invested", label: "Total invested", value: round2(totalInvested), format: "currency", currency: "USD", delta: 8.9, trend: "up", hint: "since inception" },
        { id: "valuation", label: "Post-money valuation", value: round2(currentValuation), format: "currency", currency: "USD", hint: "latest closed round" },
        { id: "investors", label: "Investors", value: this.shareholders.filter((shareholder) => shareholder.type === "investor").length, format: "number", hint: "institutional + angel" },
      ],
      totalShares,
      totalInvested: round2(totalInvested),
      currentValuation: round2(currentValuation),
      investorCount: this.shareholders.filter((shareholder) => shareholder.type === "investor").length,
      optionPoolPct: optionPool ? round2((optionPool.outstandingShares / totalShares) * 100) : 0,
      byClass: this.classes.map((entry) => ({
        className: entry.name,
        shares: entry.outstandingShares,
        pct: round2((entry.outstandingShares / totalShares) * 100),
      })),
    };
  }

  listShareholders(query: ShareholderListQuery): ShareholderListResponse {
    const q = (query.q ?? "").toLowerCase().trim();
    const filtered = this.shareholders.filter((shareholder) => {
      if (query.type && shareholder.type !== query.type) return false;
      if (!q) return true;
      return [shareholder.code, shareholder.name, shareholder.email ?? ""].join(" ").toLowerCase().includes(q);
    });

    const sortBy = query.sortBy ?? "createdAt";
    const sorted = sortRecords(filtered, sortBy, query.sortDir ?? "asc");
    const { items, total } = paginate(sorted, query.page, query.pageSize);
    return { items, meta: { total, page: query.page, pageSize: query.pageSize } };
  }

  detailShareholder(code: string): Shareholder {
    const shareholder = this.shareholders.find((record) => record.code === code);
    if (!shareholder) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Shareholder ${code} not found` });
    }
    return shareholder;
  }

  createShareholder(input: CreateShareholderInput): Shareholder {
    const now = new Date().toISOString();
    const totalShares = input.holdings.reduce((sum, holding) => sum + holding.shares, 0);
    const shareholder: Shareholder = {
      code: nextCode(this.shareholders, "SH-"),
      name: input.name,
      type: input.type,
      email: input.email,
      totalShares,
      holdings: input.holdings,
      investedAmount: input.investedAmount ?? 0,
      joinedAt: input.joinedAt,
      createdAt: now,
      updatedAt: now,
    };
    this.shareholders.push(shareholder);
    return shareholder;
  }

  updateShareholder(code: string, input: UpdateShareholderInput): Shareholder {
    const shareholder = this.detailShareholder(code);
    if (input.name !== undefined) shareholder.name = input.name;
    if (input.type !== undefined) shareholder.type = input.type;
    if (input.email !== undefined) shareholder.email = input.email;
    if (input.holdings !== undefined) {
      shareholder.holdings = input.holdings;
      shareholder.totalShares = input.holdings.reduce((sum, holding) => sum + holding.shares, 0);
    }
    if (input.investedAmount !== undefined) shareholder.investedAmount = input.investedAmount;
    if (input.joinedAt !== undefined) shareholder.joinedAt = input.joinedAt;
    shareholder.updatedAt = new Date().toISOString();
    return shareholder;
  }

  removeShareholder(code: string): void {
    const index = this.shareholders.findIndex((record) => record.code === code);
    if (index === -1) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Shareholder ${code} not found` });
    }
    this.shareholders.splice(index, 1);
  }

  listClasses(query: ShareClassListQuery): ShareClassListResponse {
    const q = (query.q ?? "").toLowerCase().trim();
    const filtered = this.classes.filter((entry) => {
      if (query.status && entry.status !== query.status) return false;
      if (!q) return true;
      return [entry.code, entry.name].join(" ").toLowerCase().includes(q);
    });

    const sortBy = query.sortBy ?? "code";
    const sorted = sortRecords(filtered, sortBy, query.sortDir ?? "asc");
    const { items, total } = paginate(sorted, query.page, query.pageSize);
    return { items, meta: { total, page: query.page, pageSize: query.pageSize } };
  }

  detailClass(code: string): ShareClass {
    const entry = this.classes.find((record) => record.code === code);
    if (!entry) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Share class ${code} not found` });
    }
    return entry;
  }

  createClass(input: CreateShareClassInput): ShareClass {
    const now = new Date().toISOString();
    const entry: ShareClass = {
      code: nextCode(this.classes, "CLS-"),
      name: input.name,
      totalShares: input.totalShares,
      outstandingShares: input.outstandingShares,
      pricePerShare: input.pricePerShare,
      voting: input.voting ?? true,
      liquidationPreference: input.liquidationPreference,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    this.classes.push(entry);
    return entry;
  }

  updateClass(code: string, input: UpdateShareClassInput): ShareClass {
    const entry = this.detailClass(code);
    if (input.name !== undefined) entry.name = input.name;
    if (input.totalShares !== undefined) entry.totalShares = input.totalShares;
    if (input.outstandingShares !== undefined) entry.outstandingShares = input.outstandingShares;
    if (input.pricePerShare !== undefined) entry.pricePerShare = input.pricePerShare;
    if (input.voting !== undefined) entry.voting = input.voting;
    if (input.liquidationPreference !== undefined) entry.liquidationPreference = input.liquidationPreference;
    entry.updatedAt = new Date().toISOString();
    return entry;
  }

  changeClassStatus(code: string, input: { status: ShareClassStatus }): ShareClass {
    const entry = this.detailClass(code);
    entry.status = input.status;
    entry.updatedAt = new Date().toISOString();
    return entry;
  }

  removeClass(code: string): void {
    const index = this.classes.findIndex((record) => record.code === code);
    if (index === -1) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Share class ${code} not found` });
    }
    this.classes.splice(index, 1);
  }

  listRounds(query: RoundListQuery): RoundListResponse {
    const q = (query.q ?? "").toLowerCase().trim();
    const filtered = this.rounds.filter((round) => {
      if (query.status && round.status !== query.status) return false;
      if (!q) return true;
      return [round.code, round.name, ...round.investors].join(" ").toLowerCase().includes(q);
    });

    const sortBy = query.sortBy ?? "announcedDate";
    const sorted = sortRecords(filtered, sortBy, query.sortDir ?? "desc");
    const { items, total } = paginate(sorted, query.page, query.pageSize);
    return { items, meta: { total, page: query.page, pageSize: query.pageSize } };
  }

  detailRound(code: string): Round {
    const round = this.rounds.find((record) => record.code === code);
    if (!round) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Funding round ${code} not found` });
    }
    return round;
  }

  createRound(input: CreateRoundInput): Round {
    const now = new Date().toISOString();
    const round: Round = {
      code: nextCode(this.rounds, "RD-"),
      name: input.name,
      type: input.type,
      announcedDate: input.announcedDate ?? now,
      closedDate: input.closedDate,
      amountRaised: input.amountRaised,
      preMoney: input.preMoney,
      postMoney: input.postMoney,
      sharesIssued: input.sharesIssued,
      valuation: input.postMoney,
      investors: input.investors,
      status: input.closedDate ? "closed" : "announced",
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    };
    this.rounds.push(round);
    return round;
  }

  updateRound(code: string, input: UpdateRoundInput): Round {
    const round = this.detailRound(code);
    if (input.name !== undefined) round.name = input.name;
    if (input.type !== undefined) round.type = input.type;
    if (input.announcedDate !== undefined) round.announcedDate = input.announcedDate;
    if (input.closedDate !== undefined) {
      round.closedDate = input.closedDate;
      if (input.closedDate) round.status = "closed";
    }
    if (input.amountRaised !== undefined) round.amountRaised = input.amountRaised;
    if (input.preMoney !== undefined) round.preMoney = input.preMoney;
    if (input.postMoney !== undefined) {
      round.postMoney = input.postMoney;
      round.valuation = input.postMoney;
    }
    if (input.sharesIssued !== undefined) round.sharesIssued = input.sharesIssued;
    if (input.investors !== undefined) round.investors = input.investors;
    if (input.notes !== undefined) round.notes = input.notes;
    round.updatedAt = new Date().toISOString();
    return round;
  }

  changeRoundStatus(code: string, input: { status: RoundStatus }): Round {
    const round = this.detailRound(code);
    round.status = input.status;
    if (input.status === "closed" && !round.closedDate) {
      round.closedDate = new Date().toISOString();
    }
    round.updatedAt = new Date().toISOString();
    return round;
  }

  removeRound(code: string): void {
    const index = this.rounds.findIndex((record) => record.code === code);
    if (index === -1) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Funding round ${code} not found` });
    }
    this.rounds.splice(index, 1);
  }

  capTable(): CapTableRow[] {
    const totalShares = this.shareholders.reduce((sum, shareholder) => sum + shareholder.totalShares, 0) || 1;
    const rows: CapTableRow[] = [];

    for (const shareholder of this.shareholders) {
      for (const holding of shareholder.holdings) {
        const entry = this.classes.find((record) => record.code === holding.classCode);
        rows.push({
          shareholderCode: shareholder.code,
          name: shareholder.name,
          type: shareholder.type,
          classCode: holding.classCode,
          className: entry?.name ?? holding.classCode,
          shares: holding.shares,
          ownershipPct: round2((holding.shares / totalShares) * 100),
          investedAmount: shareholder.investedAmount,
        });
      }
    }

    return rows.sort((a, b) => b.shares - a.shares);
  }
}
