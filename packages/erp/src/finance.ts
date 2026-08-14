import type { ErpClient } from "./client.js";
import type { DocStatus } from "./types.js";

/**
 * M5-004 (Track B): typed domain surface for the finance side of ERPNext.
 *
 * Same conventions as `sales.ts`/`purchasing.ts`: `*_FIELDS` maps platform
 * contract fields to real Frappe fields, `build<Doc>()` helpers produce
 * ERPNext doc bodies, and the client wrappers pin the doctype so the API
 * services in M5-005 never spell out a doctype string themselves.
 *
 * Expense claims are modeled with the Expense Claim doctype, journal postings
 * with Journal Entry (debit/credit account lines), and supplier payments with
 * Payment Entry of type Pay (the sales side owns the Receive flavour).
 */

export const FINANCE_DOCTYPE = {
  expenseClaim: "Expense Claim",
  journalEntry: "Journal Entry",
  account: "Account",
  paymentEntry: "Payment Entry",
} as const;

/** Platform contract field -> Frappe field for the Expense Claim doctype. */
export const EXPENSE_CLAIM_FIELDS = {
  category: "expense_type",
  date: "posting_date",
  description: "remarks",
  supplier: "supplier",
  amount: "grand_total",
  status: "approval_status",
  claimedBy: "expense_approver",
  paymentRef: "payment_reference",
} as const;

/** Platform contract field -> Frappe field for the Journal Entry doctype. */
export const JOURNAL_ENTRY_FIELDS = {
  date: "posting_date",
  reference: "reference_no",
  notes: "user_remark",
} as const;

/** Platform contract field -> Frappe field for the Account doctype. */
export const ACCOUNT_FIELDS = {
  name: "account_name",
  type: "account_type",
  parent: "parent_account",
  isGroup: "is_group",
  currency: "account_currency",
} as const;

/** Platform contract field -> Frappe field for the Payment Entry doctype. */
export const PAYMENT_ENTRY_FIELDS = {
  party: "party",
  paidAmount: "paid_amount",
  receivedAmount: "received_amount",
  method: "mode_of_payment",
  date: "posting_date",
  reference: "reference_no",
  paidFrom: "paid_from",
  paidTo: "paid_to",
} as const;

export interface ErpExpenseClaimDoc {
  name: string;
  expense_type?: string;
  posting_date?: string;
  remarks?: string;
  supplier?: string;
  grand_total?: number;
  approval_status?: string;
  expense_approver?: string;
  payment_reference?: string;
  docstatus?: DocStatus;
}

export interface ErpJournalAccountLine {
  account: string;
  party_type?: string;
  party?: string;
  debit_in_account_currency?: number;
  credit_in_account_currency?: number;
}

export interface ErpJournalEntryDoc {
  name: string;
  posting_date?: string;
  reference_no?: string;
  user_remark?: string;
  docstatus?: DocStatus;
  accounts: ErpJournalAccountLine[];
}

export interface ErpAccountDoc {
  name: string;
  account_name: string;
  account_type?: string;
  parent_account?: string;
  is_group?: number;
  account_currency?: string;
  docstatus?: DocStatus;
}

export interface ErpPaymentEntryDoc {
  name: string;
  party: string;
  party_type: "Supplier" | "Customer";
  payment_type: "Pay" | "Receive";
  paid_amount?: number;
  received_amount?: number;
  mode_of_payment?: string;
  posting_date?: string;
  reference_no?: string;
  paid_from?: string;
  paid_to?: string;
  docstatus?: DocStatus;
}

export interface ExpenseClaimInput {
  category: string;
  date?: string;
  description: string;
  supplier?: string;
  amount: number;
  status?: string;
  claimedBy?: string;
  paymentRef?: string;
}

export interface JournalEntryInput {
  date?: string;
  reference?: string;
  notes?: string;
  accounts: Array<{
    account: string;
    partyType?: "Customer" | "Supplier";
    party?: string;
    debit?: number;
    credit?: number;
  }>;
}

export interface AccountInput {
  name: string;
  type?: string;
  parent?: string;
  isGroup?: boolean;
  currency?: string;
}

export interface PaymentEntryInput {
  party: string;
  partyType: "Supplier" | "Customer";
  paymentType: "Pay" | "Receive";
  paidAmount: number;
  method?: string;
  date?: string;
  reference?: string;
  paidFrom?: string;
  paidTo?: string;
}

export function buildExpenseClaimDoc(input: ExpenseClaimInput): Record<string, unknown> {
  return {
    [EXPENSE_CLAIM_FIELDS.category]: input.category,
    [EXPENSE_CLAIM_FIELDS.date]: input.date,
    [EXPENSE_CLAIM_FIELDS.description]: input.description,
    [EXPENSE_CLAIM_FIELDS.supplier]: input.supplier,
    [EXPENSE_CLAIM_FIELDS.amount]: input.amount,
    [EXPENSE_CLAIM_FIELDS.status]: input.status,
    [EXPENSE_CLAIM_FIELDS.claimedBy]: input.claimedBy,
    [EXPENSE_CLAIM_FIELDS.paymentRef]: input.paymentRef,
  };
}

export function buildJournalEntryDoc(input: JournalEntryInput): Record<string, unknown> {
  const accounts = input.accounts.map((line) => ({
    account: line.account,
    ...(line.partyType ? { party_type: line.partyType } : {}),
    ...(line.party ? { party: line.party } : {}),
    debit_in_account_currency: line.debit,
    credit_in_account_currency: line.credit,
  }));
  return {
    [JOURNAL_ENTRY_FIELDS.date]: input.date,
    [JOURNAL_ENTRY_FIELDS.reference]: input.reference,
    [JOURNAL_ENTRY_FIELDS.notes]: input.notes,
    accounts,
  };
}

export function buildAccountDoc(input: AccountInput): Record<string, unknown> {
  return {
    [ACCOUNT_FIELDS.name]: input.name,
    [ACCOUNT_FIELDS.type]: input.type ?? "Expense",
    [ACCOUNT_FIELDS.parent]: input.parent,
    [ACCOUNT_FIELDS.isGroup]: input.isGroup ? 1 : 0,
    [ACCOUNT_FIELDS.currency]: input.currency,
  };
}

export function buildPaymentEntryDoc(input: PaymentEntryInput): Record<string, unknown> {
  return {
    [PAYMENT_ENTRY_FIELDS.party]: input.party,
    [PAYMENT_ENTRY_FIELDS.paidAmount]: input.paidAmount,
    [PAYMENT_ENTRY_FIELDS.receivedAmount]: input.paidAmount,
    [PAYMENT_ENTRY_FIELDS.method]: input.method ?? "bank_transfer",
    [PAYMENT_ENTRY_FIELDS.date]: input.date,
    [PAYMENT_ENTRY_FIELDS.reference]: input.reference,
    [PAYMENT_ENTRY_FIELDS.paidFrom]: input.paidFrom,
    [PAYMENT_ENTRY_FIELDS.paidTo]: input.paidTo,
    party_type: input.partyType,
    payment_type: input.paymentType,
  };
}

export async function createExpenseClaim(client: ErpClient, input: ExpenseClaimInput): Promise<ErpExpenseClaimDoc> {
  return client.create<ErpExpenseClaimDoc>(FINANCE_DOCTYPE.expenseClaim, buildExpenseClaimDoc(input));
}

export async function submitExpenseClaim(client: ErpClient, name: string): Promise<ErpExpenseClaimDoc> {
  return client.submit<ErpExpenseClaimDoc>(FINANCE_DOCTYPE.expenseClaim, name);
}

export async function cancelExpenseClaim(client: ErpClient, name: string): Promise<ErpExpenseClaimDoc> {
  return client.cancel<ErpExpenseClaimDoc>(FINANCE_DOCTYPE.expenseClaim, name);
}

export async function createAccount(client: ErpClient, input: AccountInput): Promise<ErpAccountDoc> {
  return client.create<ErpAccountDoc>(FINANCE_DOCTYPE.account, buildAccountDoc(input));
}

export async function findAccountByName(client: ErpClient, name: string): Promise<ErpAccountDoc | undefined> {
  const { items } = await client.list<ErpAccountDoc>(FINANCE_DOCTYPE.account, {
    filters: { account_name: name },
    fields: ["name", "account_name", "account_type", "parent_account", "is_group", "account_currency"],
    limitPageLength: 1,
  });
  return items[0];
}

export async function createJournalEntry(client: ErpClient, input: JournalEntryInput): Promise<ErpJournalEntryDoc> {
  return client.create<ErpJournalEntryDoc>(FINANCE_DOCTYPE.journalEntry, buildJournalEntryDoc(input));
}

export async function submitJournalEntry(client: ErpClient, name: string): Promise<ErpJournalEntryDoc> {
  return client.submit<ErpJournalEntryDoc>(FINANCE_DOCTYPE.journalEntry, name);
}

export async function cancelJournalEntry(client: ErpClient, name: string): Promise<ErpJournalEntryDoc> {
  return client.cancel<ErpJournalEntryDoc>(FINANCE_DOCTYPE.journalEntry, name);
}

/**
 * Records an outgoing payment to a supplier (or incoming from a customer).
 * Creates and submits the Payment Entry so the ledger updates immediately.
 */
export async function recordPaymentEntry(client: ErpClient, input: PaymentEntryInput): Promise<ErpPaymentEntryDoc> {
  const created = await client.create<ErpPaymentEntryDoc>(FINANCE_DOCTYPE.paymentEntry, buildPaymentEntryDoc(input));
  return client.submit<ErpPaymentEntryDoc>(FINANCE_DOCTYPE.paymentEntry, created.name);
}
