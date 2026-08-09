import { Injectable } from "@nestjs/common";
import {
  ErrorCode,
  type Account,
  type AccountListQuery,
  type AccountListResponse,
  type AccountStatus,
  type AccountType,
  type AccountingOverview,
  type CreateAccountInput,
  type CreateJournalEntryInput,
  type JournalEntry,
  type JournalEntryListQuery,
  type JournalEntryListResponse,
  type Ledger,
  type TrialBalance,
  type UpdateAccountInput,
  type UpdateJournalEntryInput,
} from "@amni/shared";

import { ApiException } from "../common/api.exception";

const DAY_MS = 86_400_000;
const iso = (daysAgo: number): string => new Date(Date.now() - daysAgo * DAY_MS).toISOString();
const round2 = (value: number): number => Math.round(value * 100) / 100;

const SORT_WHITELIST = new Set(["code", "name", "type", "group", "balance", "status", "createdAt", "updatedAt"]);

interface EntryLineSeed {
  accountCode: string;
  debit: number;
  credit: number;
}

function normalSign(type: AccountType): 1 | -1 {
  return type === "asset" || type === "expense" ? 1 : -1;
}

function accountName(accounts: Account[], code: string): string {
  return accounts.find((account) => account.code === code)?.name ?? code;
}

const SEED_ACCOUNTS: Account[] = [
  { code: "AC-1000", name: "Cash and equivalents", type: "asset", group: "Current Assets", currency: "USD", openingBalance: 0, balance: 42000, isGroup: false, status: "active", createdAt: iso(400), updatedAt: iso(30) },
  { code: "AC-1001", name: "Accounts receivable", type: "asset", group: "Current Assets", currency: "USD", openingBalance: 0, balance: 22480, isGroup: false, status: "active", createdAt: iso(400), updatedAt: iso(30) },
  { code: "AC-1002", name: "Inventory", type: "asset", group: "Current Assets", currency: "USD", openingBalance: 0, balance: 12600, isGroup: false, status: "active", createdAt: iso(400), updatedAt: iso(30) },
  { code: "AC-1100", name: "Equipment", type: "asset", group: "Fixed Assets", currency: "USD", openingBalance: 0, balance: 28500, isGroup: false, status: "active", createdAt: iso(300), updatedAt: iso(120) },
  { code: "AC-2000", name: "Accounts payable", type: "liability", group: "Current Liabilities", currency: "USD", openingBalance: 0, balance: -12400, isGroup: false, status: "active", createdAt: iso(400), updatedAt: iso(30) },
  { code: "AC-2001", name: "Accrued liabilities", type: "liability", group: "Current Liabilities", currency: "USD", openingBalance: 0, balance: -3800, isGroup: false, status: "active", createdAt: iso(380), updatedAt: iso(60) },
  { code: "AC-2100", name: "Bank loan", type: "liability", group: "Long-term Liabilities", currency: "USD", openingBalance: 0, balance: -24000, isGroup: false, status: "active", createdAt: iso(360), updatedAt: iso(200) },
  { code: "AC-3000", name: "Owner's equity", type: "equity", group: "Equity", currency: "USD", openingBalance: 0, balance: -56000, isGroup: false, status: "active", createdAt: iso(400), updatedAt: iso(400) },
  { code: "AC-4000", name: "Sales revenue", type: "income", group: "Revenue", currency: "USD", openingBalance: 0, balance: -48290, isGroup: false, status: "active", createdAt: iso(400), updatedAt: iso(30) },
  { code: "AC-5000", name: "Operating expenses", type: "expense", group: "Operating Costs", currency: "USD", openingBalance: 0, balance: 38910, isGroup: false, status: "active", createdAt: iso(400), updatedAt: iso(30) },
];

const SEED_ENTRIES: EntryLineSeed[][] = [
  [
    { accountCode: "AC-5000", debit: 4200, credit: 0 },
    { accountCode: "AC-2000", debit: 0, credit: 4200 },
  ],
  [
    { accountCode: "AC-5000", debit: 640, credit: 0 },
    { accountCode: "AC-2000", debit: 0, credit: 640 },
  ],
  [
    { accountCode: "AC-5000", debit: 1290, credit: 0 },
    { accountCode: "AC-2000", debit: 0, credit: 1290 },
  ],
  [
    { accountCode: "AC-1000", debit: 2900, credit: 0 },
    { accountCode: "AC-1001", debit: 0, credit: 2900 },
  ],
  [
    { accountCode: "AC-5000", debit: 500, credit: 0 },
    { accountCode: "AC-1100", debit: 0, credit: 500 },
  ],
];

const ENTRY_META: Array<Partial<JournalEntry>> = [
  { code: "GL-0001", date: iso(28), referenceType: "purchase_invoice", referenceCode: "BIL-0001", memo: "Office rent — South Bank, July", status: "posted", postedAt: iso(28), createdBy: "Amara Osei" },
  { code: "GL-0002", date: iso(21), referenceType: "purchase_invoice", referenceCode: "BIL-0002", memo: "Electricity and water — July", status: "posted", postedAt: iso(21), createdBy: "Amara Osei" },
  { code: "GL-0003", date: iso(17), referenceType: "purchase_invoice", referenceCode: "BIL-0003", memo: "Design suite annual licence", status: "posted", postedAt: iso(17), createdBy: "Amara Osei" },
  { code: "GL-0004", date: iso(9), referenceType: "payment", referenceCode: "PAY-0002", memo: "August customer payment applied", status: "posted", postedAt: iso(9), createdBy: "Theo Lindqvist" },
  { code: "GL-0005", date: iso(1), referenceType: "manual", memo: "Prepayment — office equipment depreciation", status: "draft", createdBy: "Theo Lindqvist" },
];

function buildEntryLines(accounts: Account[], seeds: EntryLineSeed[]) {
  return seeds.map((seed) => ({
    accountCode: seed.accountCode,
    accountName: accountName(accounts, seed.accountCode),
    debit: seed.debit,
    credit: seed.credit,
  }));
}

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

function paginate<T>(items: T[], page: number, pageSize: number): { items: T[]; total: number } {
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total: items.length };
}

/**
 * Reference data for the Demo Co tenant. Trial balance is derived from the
 * chart of accounts; ledgers replay posted journal entries against each
 * account's opening balance.
 */
@Injectable()
export class AccountingService {
  private accounts: Account[] = structuredClone(SEED_ACCOUNTS);
  private entries: JournalEntry[] = SEED_ENTRIES.map((seeds, index) => ({
    ...ENTRY_META[index],
    entries: buildEntryLines(this.accounts, seeds),
    createdAt: iso(28 - index * 3),
    updatedAt: iso(9 - index * 2),
  })) as JournalEntry[];

  overview(): AccountingOverview {
    const accountsByType = (["asset", "liability", "equity", "income", "expense"] as AccountType[]).map((type) => {
      const ofType = this.accounts.filter((account) => account.type === type && account.status === "active");
      return {
        type,
        count: ofType.length,
        balance: round2(ofType.reduce((sum, account) => sum + account.balance, 0)),
      };
    });

    return {
      asOf: new Date().toISOString(),
      kpis: [
        { id: "assets", label: "Total assets", value: 105580, format: "currency", currency: "USD", delta: 2.4, trend: "up", hint: "across 4 accounts" },
        { id: "liabilities", label: "Total liabilities", value: 40200, format: "currency", currency: "USD", delta: -1.2, trend: "down", hint: "across 3 accounts" },
        { id: "equity", label: "Equity", value: 56000, format: "currency", currency: "USD", hint: "owners' capital to date" },
        { id: "unposted", label: "Draft entries", value: this.entries.filter((entry) => entry.status === "draft").length, format: "number", hint: "awaiting posting" },
      ],
      accountsByType,
      recentEntries: this.entries.slice(0, 5),
    };
  }

  listAccounts(query: AccountListQuery): AccountListResponse {
    const q = (query.q ?? "").toLowerCase().trim();
    const filtered = this.accounts.filter((account) => {
      if (query.type && account.type !== query.type) return false;
      if (query.status && account.status !== query.status) return false;
      if (!q) return true;
      return [account.code, account.name, account.group].join(" ").toLowerCase().includes(q);
    });

    const sortBy = query.sortBy && SORT_WHITELIST.has(query.sortBy) ? query.sortBy : "code";
    const sortDir = (query.sortDir ?? "asc") === "asc" ? 1 : -1;
    const sorted = [...filtered].sort((a, b) => {
      const aValue = sortValue(a, sortBy);
      const bValue = sortValue(b, sortBy);
      if (aValue === bValue) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      return aValue < bValue ? -1 * sortDir : sortDir;
    });

    const { items, total } = paginate(sorted, query.page, query.pageSize);
    return { items, meta: { total, page: query.page, pageSize: query.pageSize } };
  }

  detailAccount(code: string): Account {
    const account = this.accounts.find((record) => record.code === code);
    if (!account) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Account ${code} not found` });
    }
    return account;
  }

  createAccount(input: CreateAccountInput): Account {
    const account: Account = {
      code: nextCode(this.accounts, "AC-"),
      name: input.name,
      type: input.type,
      group: input.group,
      currency: input.currency ?? "USD",
      openingBalance: input.openingBalance ?? 0,
      balance: input.openingBalance ?? 0,
      isGroup: input.isGroup ?? false,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.accounts.push(account);
    return account;
  }

  updateAccount(code: string, input: UpdateAccountInput): Account {
    const account = this.detailAccount(code);
    if (input.name !== undefined) account.name = input.name;
    if (input.type !== undefined) account.type = input.type;
    if (input.group !== undefined) account.group = input.group;
    if (input.currency !== undefined) account.currency = input.currency;
    if (input.openingBalance !== undefined) {
      account.openingBalance = input.openingBalance;
      account.balance = input.openingBalance;
    }
    if (input.isGroup !== undefined) account.isGroup = input.isGroup;
    account.updatedAt = new Date().toISOString();
    return account;
  }

  changeAccountStatus(code: string, input: { status: AccountStatus }): Account {
    const account = this.detailAccount(code);
    account.status = input.status;
    account.updatedAt = new Date().toISOString();
    return account;
  }

  removeAccount(code: string): void {
    const index = this.accounts.findIndex((record) => record.code === code);
    if (index === -1) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Account ${code} not found` });
    }
    this.accounts.splice(index, 1);
  }

  listJournalEntries(query: JournalEntryListQuery): JournalEntryListResponse {
    const q = (query.q ?? "").toLowerCase().trim();
    const filtered = this.entries.filter((entry) => {
      if (query.status && entry.status !== query.status) return false;
      if (!q) return true;
      return [entry.code, entry.memo, entry.referenceCode ?? ""].join(" ").toLowerCase().includes(q);
    });

    const sortBy = query.sortBy ?? "createdAt";
    const sortDir = query.sortDir === "asc" ? 1 : -1;
    const sorted = [...filtered].sort((a, b) => {
      const aValue = sortValue(a, sortBy);
      const bValue = sortValue(b, sortBy);
      if (aValue === bValue) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      return aValue < bValue ? -1 * sortDir : sortDir;
    });

    const { items, total } = paginate(sorted, query.page, query.pageSize);
    return { items, meta: { total, page: query.page, pageSize: query.pageSize } };
  }

  detailJournalEntry(code: string): JournalEntry {
    const entry = this.entries.find((record) => record.code === code);
    if (!entry) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Journal entry ${code} not found` });
    }
    return entry;
  }

  createJournalEntry(input: CreateJournalEntryInput): JournalEntry {
    const now = new Date().toISOString();
    const entry: JournalEntry = {
      code: nextCode(this.entries, "GL-"),
      date: input.date ?? now,
      referenceType: input.referenceType,
      referenceCode: input.referenceCode,
      memo: input.memo,
      entries: input.entries.map((line) => ({
        accountCode: line.accountCode,
        accountName: accountName(this.accounts, line.accountCode),
        debit: line.debit ?? 0,
        credit: line.credit ?? 0,
      })),
      status: "draft",
      createdBy: "System",
      createdAt: now,
      updatedAt: now,
    };
    this.entries.push(entry);
    return entry;
  }

  updateJournalEntry(code: string, input: UpdateJournalEntryInput): JournalEntry {
    const entry = this.detailJournalEntry(code);
    if (input.date !== undefined) entry.date = input.date;
    if (input.referenceType !== undefined) entry.referenceType = input.referenceType;
    if (input.referenceCode !== undefined) entry.referenceCode = input.referenceCode;
    if (input.memo !== undefined) entry.memo = input.memo;
    if (input.entries !== undefined) {
      entry.entries = input.entries.map((line) => ({
        accountCode: line.accountCode,
        accountName: accountName(this.accounts, line.accountCode),
        debit: line.debit ?? 0,
        credit: line.credit ?? 0,
      }));
    }
    entry.updatedAt = new Date().toISOString();
    return entry;
  }

  postJournalEntry(code: string): JournalEntry {
    const entry = this.detailJournalEntry(code);
    if (entry.status === "posted") return entry;
    if (entry.status === "reversed") {
      throw new ApiException({ code: ErrorCode.UNPROCESSABLE, status: 422, message: `Journal entry ${code} is reversed and cannot be posted` });
    }

    for (const line of entry.entries) {
      const account = this.detailAccount(line.accountCode);
      const sign = normalSign(account.type);
      account.balance = round2(account.balance + sign * (line.debit - line.credit));
    }
    entry.status = "posted";
    entry.postedAt = new Date().toISOString();
    entry.updatedAt = entry.postedAt;
    return entry;
  }

  reverseJournalEntry(code: string): JournalEntry {
    const entry = this.detailJournalEntry(code);
    if (entry.status !== "posted") {
      throw new ApiException({ code: ErrorCode.UNPROCESSABLE, status: 422, message: `Journal entry ${code} must be posted before reversal` });
    }

    for (const line of entry.entries) {
      const account = this.detailAccount(line.accountCode);
      const sign = normalSign(account.type);
      account.balance = round2(account.balance - sign * (line.debit - line.credit));
    }
    entry.status = "reversed";
    entry.updatedAt = new Date().toISOString();
    return entry;
  }

  removeJournalEntry(code: string): void {
    const index = this.entries.findIndex((record) => record.code === code);
    if (index === -1) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Journal entry ${code} not found` });
    }
    this.entries.splice(index, 1);
  }

  trialBalance(): TrialBalance {
    const rows = this.accounts
      .filter((account) => account.status === "active")
      .sort((a, b) => a.code.localeCompare(b.code))
      .map((account) => {
        const debit = account.balance > 0 ? account.balance : 0;
        const credit = account.balance < 0 ? -account.balance : 0;
        return {
          accountCode: account.code,
          name: account.name,
          type: account.type,
          debit: round2(debit),
          credit: round2(credit),
          balance: round2(account.balance),
        };
      });

    const totalDebit = round2(rows.reduce((sum, row) => sum + row.debit, 0));
    const totalCredit = round2(rows.reduce((sum, row) => sum + row.credit, 0));
    return { rows, totalDebit, totalCredit, generatedAt: new Date().toISOString() };
  }

  ledger(accountCode: string): Ledger {
    const account = this.detailAccount(accountCode);
    const movements = this.entries
      .filter((entry) => entry.status === "posted")
      .flatMap((entry) =>
        entry.entries
          .filter((line) => line.accountCode === accountCode)
          .map((line) => ({ entryCode: entry.code, date: entry.date, memo: entry.memo, debit: line.debit, credit: line.credit })),
      )
      .sort((a, b) => a.date.localeCompare(b.date));

    const sign = normalSign(account.type);
    let running = account.openingBalance;
    const rows = movements.map((movement) => {
      running = round2(running + sign * (movement.debit - movement.credit));
      return { date: movement.date, entryCode: movement.entryCode, memo: movement.memo, debit: movement.debit, credit: movement.credit, balance: running };
    });

    return {
      accountCode: account.code,
      name: account.name,
      openingBalance: account.openingBalance,
      movements: rows,
      closingBalance: rows.length > 0 ? running : account.balance,
    };
  }
}
