import { Injectable } from "@nestjs/common";
import {
  ErrorCode,
  type CreateCreditNoteInput,
  type CreateDocLine,
  type CreateRecurringProfileInput,
  type CreditNote,
  type CreditNoteListQuery,
  type CreditNoteListResponse,
  type CreditNoteStatus,
  type CustomerSummary,
  type DocLine,
  type DocSummary,
  type InvoicingOverview,
  type RecurringInterval,
  type RecurringProfile,
  type RecurringListQuery,
  type RecurringListResponse,
  type RecurringProfileStatus,
  type UpdateCreditNoteInput,
  type UpdateRecurringProfileInput,
} from "@amni/shared";

import { ApiException } from "../common/api.exception";

const DAY_MS = 86_400_000;
const iso = (daysOffset: number): string => new Date(Date.now() + daysOffset * DAY_MS).toISOString();
const round2 = (value: number): number => Math.round(value * 100) / 100;

const SORT_WHITELIST = new Set(["code", "invoiceCode", "date", "total", "status", "createdAt", "updatedAt"]);

const CUSTOMERS: CustomerSummary[] = [
  { code: "CUS-0001", name: "Serenity Interiors" },
  { code: "CUS-0002", name: "Lumina Supplies" },
  { code: "CUS-0003", name: "Atlas Facilities" },
  { code: "CUS-0004", name: "Northwind Traders" },
  { code: "CUS-0006", name: "Harbor & Sage" },
];

const INVOICE_CUSTOMER: Record<string, CustomerSummary> = {
  "INV-0001": CUSTOMERS[4]!,
  "INV-0002": CUSTOMERS[3]!,
  "INV-0003": CUSTOMERS[0]!,
  "INV-0005": CUSTOMERS[2]!,
};

const line = (lineNo: number, product: string, name: string, uom: string, qty: number, rate: number): DocLine => ({
  lineNo,
  product,
  name,
  uom,
  qty,
  rate,
  amount: round2(qty * rate),
});

function summarize(lines: DocLine[]): DocSummary {
  return { subtotal: round2(lines.reduce((sum, item) => sum + item.amount, 0)), discount: 0, tax: 0, total: round2(lines.reduce((sum, item) => sum + item.amount, 0)) };
}

const SEED_CREDIT_NOTES: CreditNote[] = [
  {
    code: "CRN-0001",
    invoiceCode: "INV-0002",
    customer: CUSTOMERS[3]!,
    status: "applied",
    date: iso(-40),
    currency: "USD",
    summary: summarize([line(1, "PRD-0004", "Linea lateral file cabinet", "pcs", 2, 340)]),
    items: [line(1, "PRD-0004", "Linea lateral file cabinet", "pcs", 2, 340)],
    reason: "Damaged units returned by customer",
    createdAt: iso(-42),
    updatedAt: iso(-38),
  },
  {
    code: "CRN-0002",
    invoiceCode: "INV-0004",
    customer: CUSTOMERS[1]!,
    status: "applied",
    date: iso(-28),
    currency: "USD",
    summary: summarize([line(1, "PRD-0003", "Lumen task lamp", "pcs", 5, 85)]),
    items: [line(1, "PRD-0003", "Lumen task lamp", "pcs", 5, 85)],
    reason: "Pricing discrepancy resolved",
    createdAt: iso(-30),
    updatedAt: iso(-27),
  },
  {
    code: "CRN-0003",
    invoiceCode: "INV-0008",
    customer: CUSTOMERS[3]!,
    status: "issued",
    date: iso(-6),
    currency: "USD",
    summary: summarize([line(1, "PRD-0003", "Lumen task lamp", "pcs", 3, 85)]),
    items: [line(1, "PRD-0003", "Lumen task lamp", "pcs", 3, 85)],
    reason: "Early-delivery discount agreed",
    createdAt: iso(-7),
    updatedAt: iso(-6),
  },
  {
    code: "CRN-0004",
    invoiceCode: "INV-0009",
    customer: CUSTOMERS[0]!,
    status: "draft",
    date: iso(-1),
    currency: "USD",
    summary: summarize([line(1, "PRD-0002", "Aria ergonomic chair", "pcs", 1, 620)]),
    items: [line(1, "PRD-0002", "Aria ergonomic chair", "pcs", 1, 620)],
    reason: "Awaiting return authorization",
    createdAt: iso(-2),
    updatedAt: iso(-1),
  },
];

const SEED_RECURRING: RecurringProfile[] = [
  {
    code: "RINV-0001",
    customer: CUSTOMERS[0]!,
    name: "Monthly facilities retainer",
    interval: "monthly",
    dayOfPeriod: 1,
    currency: "USD",
    summary: summarize([line(1, "SVC-001", "Facilities management retainer", "mo", 1, 1200)]),
    items: [line(1, "SVC-001", "Facilities management retainer", "mo", 1, 1200)],
    nextRun: iso(22),
    lastRun: iso(-8),
    status: "active",
    createdAt: iso(-120),
    updatedAt: iso(-8),
  },
  {
    code: "RINV-0002",
    customer: CUSTOMERS[1]!,
    name: "Quarterly design subscription",
    interval: "quarterly",
    dayOfPeriod: 15,
    currency: "USD",
    summary: summarize([line(1, "SVC-002", "Design subscription", "qtr", 1, 2400)]),
    items: [line(1, "SVC-002", "Design subscription", "qtr", 1, 2400)],
    nextRun: iso(45),
    lastRun: iso(-45),
    status: "active",
    createdAt: iso(-150),
    updatedAt: iso(-45),
  },
  {
    code: "RINV-0003",
    customer: CUSTOMERS[2]!,
    name: "Annual support contract",
    interval: "yearly",
    dayOfPeriod: 10,
    currency: "USD",
    summary: summarize([line(1, "SVC-003", "Priority support contract", "yr", 1, 7200)]),
    items: [line(1, "SVC-003", "Priority support contract", "yr", 1, 7200)],
    nextRun: iso(220),
    lastRun: iso(-145),
    status: "active",
    createdAt: iso(-200),
    updatedAt: iso(-145),
  },
  {
    code: "RINV-0004",
    customer: CUSTOMERS[3]!,
    name: "Weekly asset rental",
    interval: "weekly",
    dayOfPeriod: 1,
    currency: "USD",
    summary: summarize([line(1, "SVC-004", "Asset rental", "wk", 1, 350)]),
    items: [line(1, "SVC-004", "Asset rental", "wk", 1, 350)],
    nextRun: iso(4),
    lastRun: iso(-3),
    status: "paused",
    createdAt: iso(-60),
    updatedAt: iso(-3),
  },
];

const SEED_AP_BILLS = [
  { code: "BIL-0001", supplier: "Riverside Estates", amount: 4200, dueDate: iso(3) },
  { code: "BIL-0002", supplier: "City Power & Water", amount: 640, dueDate: iso(9) },
  { code: "BIL-0003", supplier: "Brightline Media", amount: 2350, dueDate: iso(14) },
];

function buildLines(inputs: CreateDocLine[]): DocLine[] {
  return inputs.map((input, index) => ({
    lineNo: index + 1,
    product: input.product,
    name: input.name ?? input.product,
    uom: input.uom ?? "pcs",
    qty: input.qty,
    rate: input.rate,
    amount: round2(input.qty * input.rate),
  }));
}

function nextCode(records: { code: string }[], prefix: string): string {
  const max = records.reduce((highest, record) => {
    const number = Number(record.code.slice(prefix.length));
    return number > highest ? number : highest;
  }, 0);
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

/**
 * Reference data for the Demo Co tenant. Billing center (credit notes,
 * recurring profiles) until the ERP gateway lands; the web Invoicing module
 * renders the AP register from the purchase-invoices surface.
 */
@Injectable()
export class InvoicingService {
  private creditNotes: CreditNote[] = structuredClone(SEED_CREDIT_NOTES);
  private recurring: RecurringProfile[] = structuredClone(SEED_RECURRING);

  overview(): InvoicingOverview {
    const creditNotesOutstanding = this.creditNotes
      .filter((note) => note.status === "issued")
      .reduce((sum, note) => sum + note.summary.total, 0);
    const recurringActive = this.recurring.filter((profile) => profile.status === "active").length;
    const dueSoonBills = [...SEED_AP_BILLS].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5);

    return {
      asOf: new Date().toISOString(),
      kpis: [
        { id: "billed_month", label: "Billed this month", value: 48290, format: "currency", currency: "USD", delta: 8.2, trend: "up", hint: "vs. last month" },
        { id: "outstanding_ar", label: "Outstanding AR", value: 22480, format: "currency", currency: "USD", delta: -3.1, trend: "down", hint: "draft + issued credit notes included" },
        { id: "credit_outstanding", label: "Open credit notes", value: round2(creditNotesOutstanding), format: "currency", currency: "USD", hint: "issued but not yet applied" },
        { id: "recurring_active", label: "Active recurring", value: recurringActive, format: "number", hint: "schedules billing automatically" },
      ],
      creditNotesOutstanding: round2(creditNotesOutstanding),
      recurringActive,
      dueSoonBills,
    };
  }

  listCreditNotes(query: CreditNoteListQuery): CreditNoteListResponse {
    const q = (query.q ?? "").toLowerCase().trim();
    const filtered = this.creditNotes.filter((note) => {
      if (query.status && note.status !== query.status) return false;
      if (!q) return true;
      return [note.code, note.invoiceCode, note.customer.code, note.customer.name, note.reason ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });

    const sortBy = query.sortBy && SORT_WHITELIST.has(query.sortBy) ? query.sortBy : "createdAt";
    const sortDir = query.sortDir === "asc" ? 1 : -1;
    const sorted = [...filtered].sort((a, b) => {
      const aValue = a[sortBy as keyof CreditNote];
      const bValue = b[sortBy as keyof CreditNote];
      if (aValue === bValue) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      return aValue < bValue ? -1 * sortDir : sortDir;
    });

    const page = query.page;
    const pageSize = query.pageSize;
    const start = (page - 1) * pageSize;
    return {
      items: sorted.slice(start, start + pageSize),
      meta: { total: sorted.length, page, pageSize },
    };
  }

  detailCreditNote(code: string): CreditNote {
    const note = this.creditNotes.find((record) => record.code === code);
    if (!note) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Credit note ${code} not found` });
    }
    return note;
  }

  createCreditNote(input: CreateCreditNoteInput): CreditNote {
    const customer = INVOICE_CUSTOMER[input.invoiceCode] ?? CUSTOMERS[0]!;
    const lines = buildLines(input.items);
    const note: CreditNote = {
      code: nextCode(this.creditNotes, "CRN-"),
      invoiceCode: input.invoiceCode,
      customer,
      status: "draft",
      date: input.date ?? new Date().toISOString(),
      currency: input.currency ?? "USD",
      summary: summarize(lines),
      items: lines,
      reason: input.reason,
      notes: input.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.creditNotes.push(note);
    return note;
  }

  updateCreditNote(code: string, input: UpdateCreditNoteInput): CreditNote {
    const note = this.detailCreditNote(code);
    if (input.invoiceCode !== undefined) note.invoiceCode = input.invoiceCode;
    if (input.date !== undefined) note.date = input.date;
    if (input.currency !== undefined) note.currency = input.currency;
    if (input.reason !== undefined) note.reason = input.reason;
    if (input.notes !== undefined) note.notes = input.notes;
    if (input.items !== undefined) {
      note.items = buildLines(input.items);
      note.summary = summarize(note.items);
    }
    note.updatedAt = new Date().toISOString();
    return note;
  }

  changeCreditNoteStatus(code: string, input: { status: CreditNoteStatus }): CreditNote {
    const note = this.detailCreditNote(code);
    note.status = input.status;
    note.updatedAt = new Date().toISOString();
    return note;
  }

  removeCreditNote(code: string): void {
    const index = this.creditNotes.findIndex((record) => record.code === code);
    if (index === -1) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Credit note ${code} not found` });
    }
    this.creditNotes.splice(index, 1);
  }

  listRecurring(query: RecurringListQuery): RecurringListResponse {
    const q = (query.q ?? "").toLowerCase().trim();
    const filtered = this.recurring.filter((profile) => {
      if (query.status && profile.status !== query.status) return false;
      if (!q) return true;
      return [profile.code, profile.name, profile.customer.code, profile.customer.name]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });

    const sortBy = query.sortBy ?? "createdAt";
    const sortDir = query.sortDir === "asc" ? 1 : -1;
    const sorted = [...filtered].sort((a, b) => {
      const aValue = a[sortBy as keyof RecurringProfile];
      const bValue = b[sortBy as keyof RecurringProfile];
      if (aValue === bValue) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      return aValue < bValue ? -1 * sortDir : sortDir;
    });

    const page = query.page;
    const pageSize = query.pageSize;
    const start = (page - 1) * pageSize;
    return {
      items: sorted.slice(start, start + pageSize),
      meta: { total: sorted.length, page, pageSize },
    };
  }

  detailRecurring(code: string): RecurringProfile {
    const profile = this.recurring.find((record) => record.code === code);
    if (!profile) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Recurring profile ${code} not found` });
    }
    return profile;
  }

  createRecurring(input: CreateRecurringProfileInput): RecurringProfile {
    const customer = CUSTOMERS.find((entry) => entry.code === input.customerCode) ?? CUSTOMERS[0]!;
    const lines = buildLines(input.items);
    const profile: RecurringProfile = {
      code: nextCode(this.recurring, "RINV-"),
      customer,
      name: input.name,
      interval: input.interval,
      dayOfPeriod: input.dayOfPeriod ?? 1,
      currency: input.currency ?? "USD",
      summary: summarize(lines),
      items: lines,
      nextRun: iso(30),
      status: "active",
      notes: input.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.recurring.push(profile);
    return profile;
  }

  updateRecurring(code: string, input: UpdateRecurringProfileInput): RecurringProfile {
    const profile = this.detailRecurring(code);
    if (input.name !== undefined) profile.name = input.name;
    if (input.interval !== undefined) profile.interval = input.interval as RecurringInterval;
    if (input.dayOfPeriod !== undefined) profile.dayOfPeriod = input.dayOfPeriod;
    if (input.currency !== undefined) profile.currency = input.currency;
    if (input.notes !== undefined) profile.notes = input.notes;
    if (input.items !== undefined) {
      profile.items = buildLines(input.items);
      profile.summary = summarize(profile.items);
    }
    profile.updatedAt = new Date().toISOString();
    return profile;
  }

  changeRecurringStatus(code: string, input: { status: RecurringProfileStatus }): RecurringProfile {
    const profile = this.detailRecurring(code);
    profile.status = input.status;
    profile.updatedAt = new Date().toISOString();
    return profile;
  }

  removeRecurring(code: string): void {
    const index = this.recurring.findIndex((record) => record.code === code);
    if (index === -1) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Recurring profile ${code} not found` });
    }
    this.recurring.splice(index, 1);
  }
}
