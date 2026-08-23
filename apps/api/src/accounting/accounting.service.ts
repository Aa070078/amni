import { Injectable } from "@nestjs/common";
import { ACCOUNTING_DOCTYPE, buildAccountingAccount, buildAccountingJournal, type ErpAccountingAccount, type ErpAccountingJournal, type ErpGlEntry } from "@amni/erp";
import { ErrorCode, type Account, type AccountListQuery, type AccountListResponse, type AccountStatus, type AccountType, type AccountingOverview, type CreateAccountInput, type CreateJournalEntryInput, type JournalEntry, type JournalEntryListQuery, type JournalEntryListResponse, type Ledger, type TrialBalance, type UpdateAccountInput, type UpdateJournalEntryInput } from "@amni/shared";

import { ApiException } from "../common/api.exception";
import { toIso } from "../common/frappe";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ErpGatewayService, translateErpError, type GatewayRequestMeta, type GatewayUser } from "../erp-gateway/erp-gateway.service";

const ACCOUNT_FIELDS = ["name", "account_name", "root_type", "parent_account", "account_currency", "company", "is_group", "disabled", "creation", "modified"];
const JOURNAL_FIELDS = ["name", "posting_date", "reference_no", "user_remark", "owner", "docstatus", "accounts", "creation", "modified"];

@Injectable()
export class AccountingService {
  constructor(private readonly gateway: ErpGatewayService) {}

  async overview(user: GatewayUser, meta: GatewayRequestMeta): Promise<AccountingOverview> {
    const [accounts, journals] = await Promise.all([this.allAccounts(user, meta), this.allJournals(user, meta)]);
    const balances = await this.balances(user, meta);
    const mapped = accounts.map((account) => toAccount(account, balances));
    const accountsByType = (["asset", "liability", "equity", "income", "expense"] as AccountType[]).map((type) => {
      const matches = mapped.filter((account) => account.type === type && account.status === "active");
      return { type, count: matches.length, balance: round2(matches.reduce((sum, account) => sum + account.balance, 0)) };
    });
    const assets = accountsByType.find((row) => row.type === "asset")?.balance ?? 0;
    const liabilities = Math.abs(accountsByType.find((row) => row.type === "liability")?.balance ?? 0);
    const equity = Math.abs(accountsByType.find((row) => row.type === "equity")?.balance ?? 0);
    const recentEntries = journals.slice(0, 5).map(toJournal);
    return { asOf: new Date().toISOString(), kpis: [
      { id: "assets", label: "Total assets", value: assets, format: "currency", currency: mapped[0]?.currency ?? "USD", hint: `across ${accountsByType.find((row) => row.type === "asset")?.count ?? 0} accounts` },
      { id: "liabilities", label: "Total liabilities", value: liabilities, format: "currency", currency: mapped[0]?.currency ?? "USD", hint: `across ${accountsByType.find((row) => row.type === "liability")?.count ?? 0} accounts` },
      { id: "equity", label: "Equity", value: equity, format: "currency", currency: mapped[0]?.currency ?? "USD" },
      { id: "unposted", label: "Draft entries", value: journals.filter((entry) => entry.docstatus === 0).length, format: "number", hint: "awaiting posting" },
    ], accountsByType, recentEntries };
  }

  async listAccounts(user: GatewayUser, meta: GatewayRequestMeta, query: AccountListQuery): Promise<AccountListResponse> {
    const accounts = await this.allAccounts(user, meta);
    const balances = await this.balances(user, meta);
    const q = query.q?.toLowerCase().trim();
    let items = accounts.map((account) => toAccount(account, balances)).filter((account) => (!query.type || account.type === query.type) && (!query.status || account.status === query.status) && (!q || `${account.code} ${account.name} ${account.group}`.toLowerCase().includes(q)));
    const sortBy = query.sortBy ?? "code";
    const direction = query.sortDir === "desc" ? -1 : 1;
    items = items.sort((a, b) => String(a[sortBy as keyof Account] ?? "").localeCompare(String(b[sortBy as keyof Account] ?? "")) * direction);
    const total = items.length;
    const start = (query.page - 1) * query.pageSize;
    return { items: items.slice(start, start + query.pageSize), meta: { total, page: query.page, pageSize: query.pageSize } };
  }

  async detailAccount(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<Account> {
    try { const [document, balances] = await Promise.all([this.gateway.get(user, meta, ACCOUNTING_DOCTYPE.account, code), this.balances(user, meta)]); return toAccount(document as unknown as ErpAccountingAccount, balances); }
    catch (error) { translateErpError(error, `Account ${code}`); }
  }

  async createAccount(user: GatewayUser, meta: GatewayRequestMeta, input: CreateAccountInput): Promise<Account> {
    rejectOpeningBalance(input.openingBalance);
    const parent = await this.resolveParent(user, meta, input.group);
    const created = await this.gateway.create(user, meta, ACCOUNTING_DOCTYPE.account, buildAccountingAccount({ ...input, parent: parent.name, company: parent.company }));
    return toAccount(created as unknown as ErpAccountingAccount, new Map());
  }

  async updateAccount(user: GatewayUser, meta: GatewayRequestMeta, code: string, input: UpdateAccountInput): Promise<Account> {
    const current = await this.detailAccount(user, meta, code);
    rejectOpeningBalance(input.openingBalance);
    const resolvedParent = input.group ? await this.resolveParent(user, meta, input.group) : undefined;
    const updated = await this.gateway.update(user, meta, ACCOUNTING_DOCTYPE.account, code, undefined, buildAccountingAccount({ name: input.name ?? current.name, type: input.type ?? current.type, parent: resolvedParent?.name ?? current.group, company: resolvedParent?.company, currency: input.currency ?? current.currency, isGroup: input.isGroup ?? current.isGroup }));
    return toAccount(updated as unknown as ErpAccountingAccount, await this.balances(user, meta));
  }

  async changeAccountStatus(user: GatewayUser, meta: GatewayRequestMeta, code: string, input: { status: AccountStatus }): Promise<Account> {
    const updated = await this.gateway.update(user, meta, ACCOUNTING_DOCTYPE.account, code, undefined, { disabled: input.status === "archived" ? 1 : 0 });
    return toAccount(updated as unknown as ErpAccountingAccount, await this.balances(user, meta));
  }

  removeAccount(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<void> { return this.gateway.remove(user, meta, ACCOUNTING_DOCTYPE.account, code); }

  async listJournalEntries(user: GatewayUser, meta: GatewayRequestMeta, query: JournalEntryListQuery): Promise<JournalEntryListResponse> {
    const q = query.q?.toLowerCase().trim();
    let items = (await this.allJournals(user, meta)).map(toJournal).filter((entry) => (!query.status || entry.status === query.status) && (!q || `${entry.code} ${entry.memo} ${entry.referenceCode ?? ""}`.toLowerCase().includes(q)));
    const sortBy = query.sortBy ?? "createdAt";
    const direction = query.sortDir === "asc" ? 1 : -1;
    items = items.sort((a, b) => String(a[sortBy as keyof JournalEntry] ?? "").localeCompare(String(b[sortBy as keyof JournalEntry] ?? "")) * direction);
    const total = items.length;
    const start = (query.page - 1) * query.pageSize;
    return { items: items.slice(start, start + query.pageSize), meta: { total, page: query.page, pageSize: query.pageSize } };
  }

  async detailJournalEntry(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<JournalEntry> {
    try { return toJournal(await this.gateway.get(user, meta, ACCOUNTING_DOCTYPE.journalEntry, code) as unknown as ErpAccountingJournal); }
    catch (error) { translateErpError(error, `Journal entry ${code}`); }
  }

  async createJournalEntry(user: GatewayUser, meta: GatewayRequestMeta, input: CreateJournalEntryInput): Promise<JournalEntry> {
    const company = await this.defaultCompany(user, meta);
    const created = await this.gateway.create(user, meta, ACCOUNTING_DOCTYPE.journalEntry, buildAccountingJournal({ ...input, company: company.name, costCenter: company.costCenter }));
    return toJournal(created as unknown as ErpAccountingJournal);
  }

  async updateJournalEntry(user: GatewayUser, meta: GatewayRequestMeta, code: string, input: UpdateJournalEntryInput): Promise<JournalEntry> {
    const current = await this.detailJournalEntry(user, meta, code);
    if (current.status !== "draft") throw unprocessable(`Journal entry ${code} is not editable`);
    const company = await this.defaultCompany(user, meta);
    const updated = await this.gateway.update(user, meta, ACCOUNTING_DOCTYPE.journalEntry, code, undefined, buildAccountingJournal({ company: company.name, costCenter: company.costCenter, date: input.date ?? current.date, referenceCode: input.referenceCode ?? current.referenceCode, memo: input.memo ?? current.memo, entries: input.entries ?? current.entries }));
    return toJournal(updated as unknown as ErpAccountingJournal);
  }

  async postJournalEntry(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<JournalEntry> { const current = await this.detailJournalEntry(user, meta, code); if (current.status === "posted") return current; if (current.status === "reversed") throw unprocessable(`Journal entry ${code} is reversed`); return toJournal(await this.gateway.update(user, meta, ACCOUNTING_DOCTYPE.journalEntry, code, "submit", {}) as unknown as ErpAccountingJournal); }
  async reverseJournalEntry(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<JournalEntry> { const current = await this.detailJournalEntry(user, meta, code); if (current.status !== "posted") throw unprocessable(`Journal entry ${code} must be posted before reversal`); return toJournal(await this.gateway.update(user, meta, ACCOUNTING_DOCTYPE.journalEntry, code, "cancel", {}) as unknown as ErpAccountingJournal); }
  removeJournalEntry(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<void> { return this.gateway.remove(user, meta, ACCOUNTING_DOCTYPE.journalEntry, code); }

  async trialBalance(user: GatewayUser, meta: GatewayRequestMeta): Promise<TrialBalance> {
    const accounts = (await this.allAccounts(user, meta)).map((account) => toAccount(account, new Map()));
    const balances = await this.balances(user, meta);
    const rows = accounts.filter((account) => account.status === "active" && !account.isGroup).map((account) => { const balance = balances.get(account.code) ?? 0; return { accountCode: account.code, name: account.name, type: account.type, debit: balance > 0 ? balance : 0, credit: balance < 0 ? -balance : 0, balance }; });
    return { rows, totalDebit: round2(rows.reduce((sum, row) => sum + row.debit, 0)), totalCredit: round2(rows.reduce((sum, row) => sum + row.credit, 0)), generatedAt: new Date().toISOString() };
  }

  async ledger(user: GatewayUser, meta: GatewayRequestMeta, accountCode: string): Promise<Ledger> {
    const account = await this.detailAccount(user, meta, accountCode);
    const result = await this.gateway.list(user, meta, ACCOUNTING_DOCTYPE.glEntry, { filters: { account: accountCode, is_cancelled: 0 }, fields: ["name", "account", "posting_date", "voucher_no", "remarks", "debit", "credit", "is_cancelled"], orderBy: "posting_date asc", limitPageLength: 500 });
    let running = 0;
    const movements = (result.items as unknown as ErpGlEntry[]).map((entry) => { running = round2(running + Number(entry.debit ?? 0) - Number(entry.credit ?? 0)); return { date: toIso(entry.posting_date), entryCode: entry.voucher_no ?? entry.name, memo: entry.remarks ?? "Journal entry", debit: Number(entry.debit ?? 0), credit: Number(entry.credit ?? 0), balance: running }; });
    return { accountCode, name: account.name, openingBalance: 0, movements, closingBalance: running };
  }

  private async allAccounts(user: GatewayUser, meta: GatewayRequestMeta): Promise<ErpAccountingAccount[]> { return (await this.gateway.list(user, meta, ACCOUNTING_DOCTYPE.account, { fields: ACCOUNT_FIELDS, orderBy: "name asc", limitPageLength: 500 })).items as unknown as ErpAccountingAccount[]; }
  private async allJournals(user: GatewayUser, meta: GatewayRequestMeta): Promise<ErpAccountingJournal[]> { return (await this.gateway.list(user, meta, ACCOUNTING_DOCTYPE.journalEntry, { fields: JOURNAL_FIELDS, orderBy: "creation desc", limitPageLength: 500 })).items as unknown as ErpAccountingJournal[]; }
  private async balances(user: GatewayUser, meta: GatewayRequestMeta): Promise<Map<string, number>> { const { client } = await this.gateway.scopeFor(user.id, meta.requestId); const result = await client.call<{ items: Array<{ account: string; balance: number }> }>("amni_bridge.api.get_account_balances"); return new Map(result.items.map((row) => [row.account, round2(Number(row.balance))])); }
  private async defaultCompany(user: GatewayUser, meta: GatewayRequestMeta): Promise<{ name: string; costCenter?: string }> { const companies = await this.gateway.list(user, meta, "Company", { fields: ["name", "cost_center"], orderBy: "creation asc", limitPageLength: 2 }); if (companies.items.length !== 1) throw unprocessable("The tenant ERP site must have exactly one company before accounting entries can be created"); const company = companies.items[0] as Record<string, unknown>; return { name: String(company.name), costCenter: company.cost_center ? String(company.cost_center) : undefined }; }
  private async resolveParent(user: GatewayUser, meta: GatewayRequestMeta, requested: string): Promise<ErpAccountingAccount> { const accounts = await this.allAccounts(user, meta); const match = accounts.find((account) => account.name === requested || account.account_name === requested); if (!match || !match.is_group) throw unprocessable(`Parent account ${requested} was not found or is not a group account`); return match; }
}

function toAccount(doc: ErpAccountingAccount, balances: Map<string, number>): Account { return { code: doc.name, name: doc.account_name, type: (doc.root_type?.toLowerCase() ?? "expense") as AccountType, group: doc.parent_account ?? doc.root_type ?? "Accounts", currency: doc.account_currency ?? "USD", openingBalance: 0, balance: balances.get(doc.name) ?? 0, isGroup: Boolean(doc.is_group), status: doc.disabled ? "archived" : "active", createdAt: toIso(doc.creation), updatedAt: toIso(doc.modified) }; }
function toJournal(doc: ErpAccountingJournal): JournalEntry { return { code: doc.name, date: toIso(doc.posting_date), referenceCode: doc.reference_no || undefined, entries: (doc.accounts ?? []).map((line) => ({ accountCode: line.account, accountName: line.account, debit: Number(line.debit_in_account_currency ?? 0), credit: Number(line.credit_in_account_currency ?? 0) })), status: doc.docstatus === 2 ? "reversed" : doc.docstatus === 1 ? "posted" : "draft", memo: doc.user_remark ?? "Journal entry", postedAt: doc.docstatus === 1 ? toIso(doc.modified) : null, createdBy: doc.owner, createdAt: toIso(doc.creation), updatedAt: toIso(doc.modified) }; }
function rejectOpeningBalance(value: number | undefined): void { if (value && Math.abs(value) > 0.001) throw unprocessable("Opening balances require an explicit balanced opening journal entry"); }
function unprocessable(message: string): ApiException { return new ApiException({ code: ErrorCode.UNPROCESSABLE, status: 422, message }); }
function round2(value: number): number { return Math.round(value * 100) / 100; }
