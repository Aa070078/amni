import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ErpGatewayService, GatewayRequestMeta, GatewayUser } from "../erp-gateway/erp-gateway.service";
import { AccountingService } from "./accounting.service";

const USER: GatewayUser = { id: "user-a", email: "owner@acme.test", role: "owner" };
const META: GatewayRequestMeta = { requestId: "req-accounting", ip: "127.0.0.1" };
const now = "2026-08-18T12:00:00.000Z";

function createGateway(): ErpGatewayService {
  const docs = new Map<string, Record<string, unknown>>([
    ["Company:Acme", { name: "Acme", doctype: "Company", cost_center: "Main - AC", creation: now, modified: now }],
    ["Account:Assets - AC", { name: "Assets - AC", doctype: "Account", account_name: "Assets", root_type: "Asset", is_group: 1, creation: now, modified: now }],
    ["Account:Cash - AC", { name: "Cash - AC", doctype: "Account", account_name: "Cash", root_type: "Asset", parent_account: "Assets - AC", is_group: 0, creation: now, modified: now }],
    ["Account:Liabilities - AC", { name: "Liabilities - AC", doctype: "Account", account_name: "Liabilities", root_type: "Liability", is_group: 1, creation: now, modified: now }],
    ["Account:Payables - AC", { name: "Payables - AC", doctype: "Account", account_name: "Payables", root_type: "Liability", parent_account: "Liabilities - AC", is_group: 0, creation: now, modified: now }],
    ["Journal Entry:JV-1", { name: "JV-1", doctype: "Journal Entry", posting_date: "2026-08-18", user_remark: "Accrual", docstatus: 0, accounts: [{ account: "Cash - AC", debit_in_account_currency: 100, credit_in_account_currency: 0 }, { account: "Payables - AC", debit_in_account_currency: 0, credit_in_account_currency: 100 }], creation: now, modified: now }],
    ["GL Entry:GLE-1", { name: "GLE-1", doctype: "GL Entry", account: "Cash - AC", posting_date: "2026-08-18", voucher_no: "JV-0", debit: 250, credit: 0, is_cancelled: 0 }],
  ]);
  let sequence = 2;
  return {
    list: vi.fn(async (_user, _meta, doctype, options) => {
      let items = [...docs.values()].filter((doc) => doc.doctype === doctype);
      const filters = options?.filters as Record<string, unknown> | undefined;
      if (filters) items = items.filter((doc) => Object.entries(filters).every(([key, value]) => String(doc[key] ?? "") === String(value)));
      return { items, total: items.length };
    }),
    get: vi.fn(async (_user, _meta, doctype, name) => {
      const doc = docs.get(`${doctype}:${name}`);
      if (!doc) throw Object.assign(new Error("Not Found"), { status: 404 });
      return doc;
    }),
    create: vi.fn(async (_user, _meta, doctype, input) => {
      const name = doctype === "Account" ? `${String(input.account_name)} - AC` : `JV-${sequence++}`;
      const doc = { name, doctype, docstatus: 0, creation: now, modified: now, ...input };
      docs.set(`${doctype}:${name}`, doc);
      return doc;
    }),
    update: vi.fn(async (_user, _meta, doctype, name, action, input) => {
      const current = docs.get(`${doctype}:${name}`);
      if (!current) throw Object.assign(new Error("Not Found"), { status: 404 });
      const doc = { ...current, ...input, modified: now, ...(action === "submit" ? { docstatus: 1 } : {}), ...(action === "cancel" ? { docstatus: 2 } : {}) };
      docs.set(`${doctype}:${name}`, doc);
      return doc;
    }),
    remove: vi.fn(async (_user, _meta, doctype, name) => { docs.delete(`${doctype}:${name}`); }),
    scopeFor: vi.fn(async () => ({ client: { call: vi.fn(async () => ({ items: [{ account: "Cash - AC", balance: 250 }, { account: "Payables - AC", balance: -250 }] })) } })),
  } as unknown as ErpGatewayService;
}

describe("AccountingService ERP persistence", () => {
  let service: AccountingService;
  beforeEach(() => { service = new AccountingService(createGateway()); });

  it("lists tenant accounts with balances and creates native accounts", async () => {
    const listed = await service.listAccounts(USER, META, { page: 1, pageSize: 20, type: "asset" });
    expect(listed.meta.total).toBe(2);
    expect(listed.items.find((item) => item.code === "Cash - AC")?.balance).toBe(250);
    const created = await service.createAccount(USER, META, { name: "Petty Cash", type: "asset", group: "Assets - AC" });
    expect(created.code).toBe("Petty Cash - AC");
  });

  it("rejects unsafe unbalanced opening balances", async () => {
    await expect(service.createAccount(USER, META, { name: "Unsafe", type: "asset", group: "Assets - AC", openingBalance: 100 })).rejects.toMatchObject({ status: 422 });
  });

  it("creates, posts, and prevents invalid reversal transitions", async () => {
    const created = await service.createJournalEntry(USER, META, { memo: "Balanced entry", entries: [{ accountCode: "Cash - AC", debit: 50, credit: 0 }, { accountCode: "Payables - AC", debit: 0, credit: 50 }] });
    expect(created.status).toBe("draft");
    expect((await service.postJournalEntry(USER, META, created.code)).status).toBe("posted");
    await expect(service.reverseJournalEntry(USER, META, "JV-1")).rejects.toMatchObject({ status: 422 });
  });

  it("derives trial balance and ledger from native GL entries", async () => {
    const trial = await service.trialBalance(USER, META);
    expect(trial.totalDebit).toBe(250);
    expect(trial.totalCredit).toBe(250);
    const ledger = await service.ledger(USER, META, "Cash - AC");
    expect(ledger.closingBalance).toBe(250);
    expect(ledger.movements[0]?.entryCode).toBe("JV-0");
  });
});
