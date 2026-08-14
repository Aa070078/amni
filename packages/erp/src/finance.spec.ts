import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErpClient } from "./client.js";
import {
  FINANCE_DOCTYPE,
  EXPENSE_CLAIM_FIELDS,
  JOURNAL_ENTRY_FIELDS,
  ACCOUNT_FIELDS,
  PAYMENT_ENTRY_FIELDS,
  buildAccountDoc,
  buildExpenseClaimDoc,
  buildJournalEntryDoc,
  buildPaymentEntryDoc,
  cancelExpenseClaim,
  cancelJournalEntry,
  createAccount,
  createExpenseClaim,
  createJournalEntry,
  findAccountByName,
  recordPaymentEntry,
  submitExpenseClaim,
  submitJournalEntry,
} from "./index.js";

const BASE_URL = "https://acme.example.com";
const API_KEY = "0000aa";
const API_SECRET = "secret";

function installFetch(
  handler: (input: string | URL, init: RequestInit) => Response | Promise<Response>,
): { fetchMock: ReturnType<typeof vi.fn>; lastUrl: () => URL; lastInit: () => RequestInit } {
  let capturedUrl: URL | undefined;
  let capturedInit: RequestInit | undefined;
  const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
    capturedUrl = new URL(String(input));
    capturedInit = init ?? {};
    return handler(input, init ?? {});
  });
  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, lastUrl: () => capturedUrl!, lastInit: () => capturedInit! };
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const decoded = (url: URL): string => decodeURIComponent(String(url));

function makeClient(overrides: Partial<ConstructorParameters<typeof ErpClient>[0]> = {}) {
  return new ErpClient({ baseUrl: BASE_URL, apiKey: API_KEY, apiSecret: API_SECRET, allowHost: "acme.example.com", ...overrides });
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("finance doc builders", () => {
  it("builds an Expense Claim doc using the field map", () => {
    const doc = buildExpenseClaimDoc({
      category: "travel",
      date: "2026-08-01",
      description: "Client site visit",
      supplier: "Uber",
      amount: 120.5,
      status: "Approved",
      claimedBy: "Jane Doe",
      paymentRef: "PAY-0001",
    });
    expect(doc[EXPENSE_CLAIM_FIELDS.category]).toBe("travel");
    expect(doc[EXPENSE_CLAIM_FIELDS.date]).toBe("2026-08-01");
    expect(doc[EXPENSE_CLAIM_FIELDS.description]).toBe("Client site visit");
    expect(doc[EXPENSE_CLAIM_FIELDS.supplier]).toBe("Uber");
    expect(doc[EXPENSE_CLAIM_FIELDS.amount]).toBe(120.5);
    expect(doc[EXPENSE_CLAIM_FIELDS.status]).toBe("Approved");
    expect(doc[EXPENSE_CLAIM_FIELDS.claimedBy]).toBe("Jane Doe");
    expect(doc[EXPENSE_CLAIM_FIELDS.paymentRef]).toBe("PAY-0001");
  });

  it("builds a Journal Entry doc with debit/credit account lines", () => {
    const doc = buildJournalEntryDoc({
      date: "2026-08-15",
      reference: "JV-0001",
      notes: "August accrual",
      accounts: [
        { account: "Office Expenses", debit: 500 },
        { account: "Cash", credit: 500 },
      ],
    });
    expect(doc[JOURNAL_ENTRY_FIELDS.date]).toBe("2026-08-15");
    expect(doc[JOURNAL_ENTRY_FIELDS.reference]).toBe("JV-0001");
    expect(doc.accounts).toEqual([
      expect.objectContaining({ account: "Office Expenses", debit_in_account_currency: 500 }),
      expect.objectContaining({ account: "Cash", credit_in_account_currency: 500 }),
    ]);
  });

  it("builds an Account doc with group flag", () => {
    const doc = buildAccountDoc({ name: "Office Expenses", type: "Expense", parent: "Direct Expenses", isGroup: false });
    expect(doc[ACCOUNT_FIELDS.name]).toBe("Office Expenses");
    expect(doc[ACCOUNT_FIELDS.type]).toBe("Expense");
    expect(doc[ACCOUNT_FIELDS.parent]).toBe("Direct Expenses");
    expect(doc[ACCOUNT_FIELDS.isGroup]).toBe(0);
  });

  it("builds a Payment Entry as a Supplier Pay", () => {
    const doc = buildPaymentEntryDoc({
      party: "Northwind Traders",
      partyType: "Supplier",
      paymentType: "Pay",
      paidAmount: 250,
      method: "bank_transfer",
    });
    expect(doc).toMatchObject({
      [PAYMENT_ENTRY_FIELDS.party]: "Northwind Traders",
      [PAYMENT_ENTRY_FIELDS.paidAmount]: 250,
      party_type: "Supplier",
      payment_type: "Pay",
    });
  });
});

describe("finance client wrappers", () => {
  it("finds an account by name with doctype-scoped fields", async () => {
    const { lastUrl } = installFetch(() => jsonResponse(200, { data: [{ name: "Office Expenses", account_name: "Office Expenses" }] }));
    const client = makeClient();
    const found = await findAccountByName(client, "Office Expenses");
    expect(found?.name).toBe("Office Expenses");
    expect(String(lastUrl())).toContain(`/resource/${FINANCE_DOCTYPE.account}`);
  });

  it("creates an account through the Account doctype", async () => {
    const { lastUrl, lastInit } = installFetch(() => jsonResponse(200, { data: { name: "Office Expenses" } }));
    const client = makeClient();
    await createAccount(client, { name: "Office Expenses", type: "Expense" });
    expect(String(lastUrl())).toContain(`/resource/${FINANCE_DOCTYPE.account}`);
    expect(JSON.parse(String(lastInit().body))).toMatchObject({ account_name: "Office Expenses", account_type: "Expense" });
  });

  it("creates an expense claim then submits and cancels it", async () => {
    const { fetchMock, lastUrl } = installFetch(() => jsonResponse(200, { data: { name: "EXP-0001" } }));
    const client = makeClient();
    const doc = await createExpenseClaim(client, { category: "travel", description: "Client visit", amount: 120.5 });
    expect(doc.name).toBe("EXP-0001");
    expect(decoded(lastUrl())).toContain(`/resource/${FINANCE_DOCTYPE.expenseClaim}`);

    await submitExpenseClaim(client, doc.name);
    expect(decoded(lastUrl())).toContain("action=submit");

    await cancelExpenseClaim(client, doc.name);
    expect(decoded(lastUrl())).toContain("action=cancel");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("creates a journal entry then submits and cancels it", async () => {
    const { lastUrl } = installFetch(() => jsonResponse(200, { data: { name: "JV-0001" } }));
    const client = makeClient();
    const doc = await createJournalEntry(client, {
      reference: "JV-0001",
      accounts: [{ account: "Office Expenses", debit: 500 }, { account: "Cash", credit: 500 }],
    });
    expect(doc.name).toBe("JV-0001");
    expect(decoded(lastUrl())).toContain(`/resource/${FINANCE_DOCTYPE.journalEntry}`);

    await submitJournalEntry(client, doc.name);
    expect(decoded(lastUrl())).toContain("action=submit");

    await cancelJournalEntry(client, doc.name);
    expect(decoded(lastUrl())).toContain("action=cancel");
  });

  it("records a supplier payment by creating and submitting a Payment Entry", async () => {
    const { lastUrl } = installFetch(() => jsonResponse(200, { data: { name: "PAY-0001", party: "Northwind Traders" } }));
    const client = makeClient();
    await recordPaymentEntry(client, { party: "Northwind Traders", partyType: "Supplier", paymentType: "Pay", paidAmount: 250 });
    const finalUrl = decoded(lastUrl());
    expect(finalUrl).toContain(`/resource/${FINANCE_DOCTYPE.paymentEntry}`);
    expect(finalUrl).toContain("action=submit");
  });
});
