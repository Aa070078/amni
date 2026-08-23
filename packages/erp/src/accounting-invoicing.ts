import type { ErpDocLine } from "./sales.js";

export const ACCOUNTING_DOCTYPE = {
  account: "Account",
  journalEntry: "Journal Entry",
  glEntry: "GL Entry",
  salesInvoice: "Sales Invoice",
  purchaseInvoice: "Purchase Invoice",
  autoRepeat: "Auto Repeat",
} as const;

export interface ErpAccountingAccount {
  name: string;
  account_name: string;
  root_type?: "Asset" | "Liability" | "Equity" | "Income" | "Expense";
  company?: string;
  parent_account?: string;
  account_currency?: string;
  is_group?: number;
  disabled?: number;
  creation?: string;
  modified?: string;
}

export interface ErpAccountingJournalLine {
  account: string;
  debit_in_account_currency?: number;
  credit_in_account_currency?: number;
}

export interface ErpAccountingJournal {
  name: string;
  posting_date?: string;
  reference_no?: string;
  user_remark?: string;
  owner?: string;
  docstatus?: 0 | 1 | 2;
  accounts?: ErpAccountingJournalLine[];
  creation?: string;
  modified?: string;
}

export interface ErpGlEntry {
  name: string;
  account: string;
  posting_date?: string;
  voucher_no?: string;
  remarks?: string;
  debit?: number;
  credit?: number;
  is_cancelled?: number;
}

export interface ErpCreditNoteInvoice {
  name: string;
  company?: string;
  customer: string;
  customer_name?: string;
  posting_date?: string;
  due_date?: string;
  currency?: string;
  grand_total?: number;
  base_grand_total?: number;
  outstanding_amount?: number;
  base_outstanding_amount?: number;
  remarks?: string;
  return_against?: string;
  is_return?: number;
  status?: string;
  docstatus?: 0 | 1 | 2;
  items?: ErpDocLine[];
  creation?: string;
  modified?: string;
}

export interface ErpAutoRepeat {
  name: string;
  reference_doctype: string;
  reference_document: string;
  start_date?: string;
  end_date?: string;
  frequency?: "Daily" | "Weekly" | "Monthly" | "Quarterly" | "Yearly";
  repeat_on_day?: number;
  next_schedule_date?: string;
  disabled?: number;
  status?: string;
  creation?: string;
  modified?: string;
}

export function buildAccountingAccount(input: {
  name: string;
  type: string;
  parent: string;
  company?: string;
  currency?: string;
  isGroup?: boolean;
}): Record<string, unknown> {
  return {
    account_name: input.name,
    root_type: titleCase(input.type),
    parent_account: input.parent,
    company: input.company,
    account_currency: input.currency,
    is_group: input.isGroup ? 1 : 0,
    disabled: 0,
  };
}

export function buildAccountingJournal(input: {
  company?: string;
  costCenter?: string;
  date?: string;
  referenceCode?: string;
  memo: string;
  entries: Array<{ accountCode: string; debit?: number; credit?: number }>;
}): Record<string, unknown> {
  return {
    company: input.company,
    posting_date: input.date?.slice(0, 10),
    reference_no: input.referenceCode,
    user_remark: input.memo,
    accounts: input.entries.map((line) => ({
      account: line.accountCode,
      debit_in_account_currency: line.debit ?? 0,
      credit_in_account_currency: line.credit ?? 0,
      cost_center: input.costCenter,
    })),
  };
}

export function buildCreditNote(input: {
  invoiceCode: string;
  customer: string;
  company?: string;
  date?: string;
  currency?: string;
  reason?: string;
  notes?: string;
  items: Array<{ product: string; name?: string; uom?: string; qty: number; rate: number }>;
}): Record<string, unknown> {
  const date = input.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
  return {
    customer: input.customer,
    company: input.company,
    posting_date: date,
    due_date: date,
    currency: input.currency,
    is_return: 1,
    return_against: input.invoiceCode,
    remarks: [input.reason, input.notes].filter(Boolean).join("\n\n"),
    items: input.items.map((line) => ({
      item_code: line.product,
      item_name: line.name,
      uom: line.uom ?? "pcs",
      qty: -Math.abs(line.qty),
      rate: line.rate,
    })),
  };
}

export function buildRecurringInvoiceTemplate(input: {
  customer: string;
  company?: string;
  currency?: string;
  notes?: string;
  items: Array<{ product: string; name?: string; uom?: string; qty: number; rate: number }>;
}): Record<string, unknown> {
  const today = new Date().toISOString().slice(0, 10);
  return {
    customer: input.customer,
    company: input.company,
    posting_date: today,
    due_date: today,
    currency: input.currency,
    remarks: input.notes,
    items: input.items.map((line) => ({ item_code: line.product, item_name: line.name, uom: line.uom ?? "pcs", qty: line.qty, rate: line.rate })),
  };
}

export function buildAutoRepeat(input: {
  referenceDocument: string;
  name?: string;
  interval: string;
  dayOfPeriod?: number;
  startDate?: string;
}): Record<string, unknown> {
  return {
    reference_doctype: ACCOUNTING_DOCTYPE.salesInvoice,
    reference_document: input.referenceDocument,
    subject: input.name,
    start_date: input.startDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    frequency: titleCase(input.interval),
    repeat_on_day: input.dayOfPeriod ?? 1,
    disabled: 0,
    submit_on_creation: 1,
  };
}

function titleCase(value: string): string {
  return value.length ? `${value[0]!.toUpperCase()}${value.slice(1).toLowerCase()}` : value;
}
