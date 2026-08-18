import { Injectable } from "@nestjs/common";
import { ACCOUNTING_DOCTYPE, buildAutoRepeat, buildCreditNote, buildRecurringInvoiceTemplate, type ErpAutoRepeat, type ErpCreditNoteInvoice } from "@amni/erp";
import { ErrorCode, type CreateCreditNoteInput, type CreateRecurringProfileInput, type CreditNote, type CreditNoteListQuery, type CreditNoteListResponse, type CreditNoteStatus, type DocLine, type InvoicingOverview, type RecurringInterval, type RecurringListQuery, type RecurringListResponse, type RecurringProfile, type RecurringProfileStatus, type UpdateCreditNoteInput, type UpdateRecurringProfileInput } from "@amni/shared";

import { ApiException } from "../common/api.exception";
import { toIso } from "../common/frappe";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ErpGatewayService, translateErpError, type GatewayRequestMeta, type GatewayUser } from "../erp-gateway/erp-gateway.service";

const CREDIT_FIELDS = ["name", "company", "customer", "customer_name", "posting_date", "currency", "grand_total", "base_grand_total", "outstanding_amount", "base_outstanding_amount", "remarks", "return_against", "is_return", "status", "docstatus", "items", "creation", "modified"];
const AUTO_REPEAT_FIELDS = ["name", "reference_doctype", "reference_document", "start_date", "end_date", "frequency", "repeat_on_day", "next_schedule_date", "disabled", "status", "subject", "creation", "modified"];

@Injectable()
export class InvoicingService {
  constructor(private readonly gateway: ErpGatewayService) {}

  async overview(user: GatewayUser, meta: GatewayRequestMeta): Promise<InvoicingOverview> {
    const [sales, credits, recurring, purchases, company] = await Promise.all([
      this.gateway.list(user, meta, ACCOUNTING_DOCTYPE.salesInvoice, { fields: ["name", "posting_date", "base_grand_total", "base_outstanding_amount", "is_return", "docstatus"], orderBy: "posting_date desc", limitPageLength: 500 }),
      this.listCreditDocuments(user, meta),
      this.listAutoRepeats(user, meta),
      this.gateway.list(user, meta, ACCOUNTING_DOCTYPE.purchaseInvoice, { fields: ["name", "supplier", "due_date", "grand_total", "outstanding_amount", "docstatus"], orderBy: "due_date asc", limitPageLength: 100 }),
      this.companyContext(user, meta),
    ]);
    const month = new Date().toISOString().slice(0, 7);
    const invoices = sales.items as Array<Record<string, unknown>>;
    const currency = company.currency;
    const billedMonth = invoices.filter((invoice) => !invoice.is_return && Number(invoice.docstatus) === 1 && String(invoice.posting_date ?? "").startsWith(month)).reduce((sum, invoice) => sum + Number(invoice.base_grand_total ?? 0), 0);
    const outstandingAr = invoices.filter((invoice) => !invoice.is_return && Number(invoice.docstatus) === 1).reduce((sum, invoice) => sum + Number(invoice.base_outstanding_amount ?? 0), 0);
    const creditNotesOutstanding = credits.filter((note) => creditStatus(note) === "issued").reduce((sum, note) => sum + Math.abs(Number(note.base_outstanding_amount ?? note.base_grand_total ?? 0)), 0);
    const recurringActive = recurring.filter((profile) => !profile.disabled && profile.status !== "Completed").length;
    const dueSoonBills = (purchases.items as Array<Record<string, unknown>>).filter((bill) => Number(bill.docstatus) === 1 && Number(bill.outstanding_amount ?? 0) > 0).slice(0, 5).map((bill) => ({ code: String(bill.name), supplier: String(bill.supplier ?? ""), amount: Number(bill.outstanding_amount ?? bill.grand_total ?? 0), dueDate: toIso(String(bill.due_date ?? "")) }));
    return { asOf: new Date().toISOString(), kpis: [
      { id: "billed_month", label: "Billed this month", value: round2(billedMonth), format: "currency", currency, hint: "submitted invoices" },
      { id: "outstanding_ar", label: "Outstanding AR", value: round2(outstandingAr), format: "currency", currency, hint: "submitted invoices" },
      { id: "credit_outstanding", label: "Open credit notes", value: round2(creditNotesOutstanding), format: "currency", currency, hint: "issued but not allocated" },
      { id: "recurring_active", label: "Active recurring", value: recurringActive, format: "number", hint: "ERPNext Auto Repeat schedules" },
    ], creditNotesOutstanding: round2(creditNotesOutstanding), recurringActive, dueSoonBills };
  }

  async listCreditNotes(user: GatewayUser, meta: GatewayRequestMeta, query: CreditNoteListQuery): Promise<CreditNoteListResponse> {
    const q = query.q?.toLowerCase().trim();
    let items = (await this.listCreditDocuments(user, meta)).map(toCreditNote).filter((note) => (!query.status || note.status === query.status) && (!q || `${note.code} ${note.invoiceCode} ${note.customer.name} ${note.reason ?? ""}`.toLowerCase().includes(q)));
    const sortBy = query.sortBy ?? "createdAt";
    const direction = query.sortDir === "asc" ? 1 : -1;
    items = items.sort((a, b) => String(a[sortBy as keyof CreditNote] ?? "").localeCompare(String(b[sortBy as keyof CreditNote] ?? "")) * direction);
    const total = items.length;
    const start = (query.page - 1) * query.pageSize;
    return { items: items.slice(start, start + query.pageSize), meta: { total, page: query.page, pageSize: query.pageSize } };
  }

  async detailCreditNote(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<CreditNote> {
    try { const document = await this.gateway.get(user, meta, ACCOUNTING_DOCTYPE.salesInvoice, code) as unknown as ErpCreditNoteInvoice; if (!document.is_return) throw notFound(`Credit note ${code}`); return toCreditNote(document); }
    catch (error) { translateErpError(error, `Credit note ${code}`); }
  }

  async createCreditNote(user: GatewayUser, meta: GatewayRequestMeta, input: CreateCreditNoteInput): Promise<CreditNote> {
    const invoice = await this.getInvoice(user, meta, input.invoiceCode);
    const created = await this.gateway.create(user, meta, ACCOUNTING_DOCTYPE.salesInvoice, buildCreditNote({ ...input, customer: invoice.customer, company: invoice.company, currency: invoice.currency ?? input.currency }));
    return toCreditNote(created as unknown as ErpCreditNoteInvoice);
  }

  async updateCreditNote(user: GatewayUser, meta: GatewayRequestMeta, code: string, input: UpdateCreditNoteInput): Promise<CreditNote> {
    const current = await this.detailCreditNote(user, meta, code);
    if (current.status !== "draft") throw unprocessable(`Credit note ${code} is not editable`);
    const invoiceCode = input.invoiceCode ?? current.invoiceCode;
    const invoice = await this.getInvoice(user, meta, invoiceCode);
    const updated = await this.gateway.update(user, meta, ACCOUNTING_DOCTYPE.salesInvoice, code, undefined, buildCreditNote({ invoiceCode, customer: invoice.customer, company: invoice.company, date: input.date ?? current.date, currency: invoice.currency ?? input.currency ?? current.currency, reason: input.reason ?? current.reason, notes: input.notes ?? current.notes, items: input.items ?? current.items }));
    return toCreditNote(updated as unknown as ErpCreditNoteInvoice);
  }

  async changeCreditNoteStatus(user: GatewayUser, meta: GatewayRequestMeta, code: string, input: { status: CreditNoteStatus }): Promise<CreditNote> {
    const current = await this.detailCreditNote(user, meta, code);
    if (input.status === current.status) return current;
    if (input.status === "issued" || input.status === "applied") return toCreditNote(await this.gateway.update(user, meta, ACCOUNTING_DOCTYPE.salesInvoice, code, "submit", {}) as unknown as ErpCreditNoteInvoice);
    if (input.status === "void") return toCreditNote(await this.gateway.update(user, meta, ACCOUNTING_DOCTYPE.salesInvoice, code, "cancel", {}) as unknown as ErpCreditNoteInvoice);
    throw unprocessable("Submitted credit notes cannot return to draft");
  }

  removeCreditNote(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<void> { return this.gateway.remove(user, meta, ACCOUNTING_DOCTYPE.salesInvoice, code); }

  async listRecurring(user: GatewayUser, meta: GatewayRequestMeta, query: RecurringListQuery): Promise<RecurringListResponse> {
    const repeats = await this.listAutoRepeats(user, meta);
    const profiles = await Promise.all(repeats.map((repeat) => this.toRecurring(user, meta, repeat)));
    const q = query.q?.toLowerCase().trim();
    let items = profiles.filter((profile) => (!query.status || profile.status === query.status) && (!q || `${profile.code} ${profile.name} ${profile.customer.name}`.toLowerCase().includes(q)));
    const sortBy = query.sortBy ?? "createdAt";
    const direction = query.sortDir === "asc" ? 1 : -1;
    items = items.sort((a, b) => String(a[sortBy as keyof RecurringProfile] ?? "").localeCompare(String(b[sortBy as keyof RecurringProfile] ?? "")) * direction);
    const total = items.length;
    const start = (query.page - 1) * query.pageSize;
    return { items: items.slice(start, start + query.pageSize), meta: { total, page: query.page, pageSize: query.pageSize } };
  }

  async detailRecurring(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<RecurringProfile> {
    try { return this.toRecurring(user, meta, await this.gateway.get(user, meta, ACCOUNTING_DOCTYPE.autoRepeat, code) as unknown as ErpAutoRepeat); }
    catch (error) { translateErpError(error, `Recurring profile ${code}`); }
  }

  async createRecurring(user: GatewayUser, meta: GatewayRequestMeta, input: CreateRecurringProfileInput): Promise<RecurringProfile> {
    const company = await this.companyContext(user, meta);
    const template = await this.gateway.create(user, meta, ACCOUNTING_DOCTYPE.salesInvoice, buildRecurringInvoiceTemplate({ customer: input.customerCode, company: company.name, currency: input.currency, notes: input.notes, items: input.items }));
    try { const repeat = await this.gateway.create(user, meta, ACCOUNTING_DOCTYPE.autoRepeat, buildAutoRepeat({ referenceDocument: String(template.name), name: input.name, interval: input.interval, dayOfPeriod: input.dayOfPeriod })); return this.toRecurring(user, meta, repeat as unknown as ErpAutoRepeat); }
    catch (error) { await this.gateway.remove(user, meta, ACCOUNTING_DOCTYPE.salesInvoice, String(template.name)); throw error; }
  }

  async updateRecurring(user: GatewayUser, meta: GatewayRequestMeta, code: string, input: UpdateRecurringProfileInput): Promise<RecurringProfile> {
    const repeat = await this.gateway.get(user, meta, ACCOUNTING_DOCTYPE.autoRepeat, code) as unknown as ErpAutoRepeat;
    const current = await this.toRecurring(user, meta, repeat);
    const company = await this.companyContext(user, meta);
    await this.gateway.update(user, meta, ACCOUNTING_DOCTYPE.salesInvoice, repeat.reference_document, undefined, buildRecurringInvoiceTemplate({ customer: input.customerCode ?? current.customer.code, company: company.name, currency: input.currency ?? current.currency, notes: input.notes ?? current.notes, items: input.items ?? current.items }));
    const updated = await this.gateway.update(user, meta, ACCOUNTING_DOCTYPE.autoRepeat, code, undefined, buildAutoRepeat({ referenceDocument: repeat.reference_document, name: input.name ?? current.name, interval: input.interval ?? current.interval, dayOfPeriod: input.dayOfPeriod ?? current.dayOfPeriod, startDate: repeat.start_date }));
    return this.toRecurring(user, meta, updated as unknown as ErpAutoRepeat);
  }

  async changeRecurringStatus(user: GatewayUser, meta: GatewayRequestMeta, code: string, input: { status: RecurringProfileStatus }): Promise<RecurringProfile> {
    const updated = await this.gateway.update(user, meta, ACCOUNTING_DOCTYPE.autoRepeat, code, undefined, { disabled: input.status === "active" ? 0 : 1, ...(input.status === "ended" ? { end_date: new Date().toISOString().slice(0, 10) } : {}) });
    return this.toRecurring(user, meta, updated as unknown as ErpAutoRepeat);
  }

  async removeRecurring(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<void> { const repeat = await this.gateway.get(user, meta, ACCOUNTING_DOCTYPE.autoRepeat, code) as unknown as ErpAutoRepeat; await this.gateway.remove(user, meta, ACCOUNTING_DOCTYPE.autoRepeat, code); await this.gateway.remove(user, meta, ACCOUNTING_DOCTYPE.salesInvoice, repeat.reference_document); }

  private async listCreditDocuments(user: GatewayUser, meta: GatewayRequestMeta): Promise<ErpCreditNoteInvoice[]> { return (await this.gateway.list(user, meta, ACCOUNTING_DOCTYPE.salesInvoice, { filters: { is_return: 1 }, fields: CREDIT_FIELDS, orderBy: "creation desc", limitPageLength: 500 })).items as unknown as ErpCreditNoteInvoice[]; }
  private async listAutoRepeats(user: GatewayUser, meta: GatewayRequestMeta): Promise<ErpAutoRepeat[]> { return (await this.gateway.list(user, meta, ACCOUNTING_DOCTYPE.autoRepeat, { filters: { reference_doctype: ACCOUNTING_DOCTYPE.salesInvoice }, fields: AUTO_REPEAT_FIELDS, orderBy: "creation desc", limitPageLength: 200 })).items as unknown as ErpAutoRepeat[]; }
  private async getInvoice(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<ErpCreditNoteInvoice> { try { const invoice = await this.gateway.get(user, meta, ACCOUNTING_DOCTYPE.salesInvoice, code) as unknown as ErpCreditNoteInvoice; if (invoice.is_return) throw notFound(`Sales invoice ${code}`); return invoice; } catch (error) { translateErpError(error, `Sales invoice ${code}`); } }
  private async companyContext(user: GatewayUser, meta: GatewayRequestMeta): Promise<{ name: string; currency: string }> { const companies = await this.gateway.list(user, meta, "Company", { fields: ["name", "default_currency"], orderBy: "creation asc", limitPageLength: 2 }); if (companies.items.length !== 1) throw unprocessable("The tenant ERP site must have exactly one company before invoicing can be configured"); const company = companies.items[0] as Record<string, unknown>; return { name: String(company.name), currency: String(company.default_currency ?? "USD") }; }
  private async toRecurring(user: GatewayUser, meta: GatewayRequestMeta, repeat: ErpAutoRepeat): Promise<RecurringProfile> { const invoice = await this.gateway.get(user, meta, ACCOUNTING_DOCTYPE.salesInvoice, repeat.reference_document) as unknown as ErpCreditNoteInvoice; const items = toLines(invoice.items, false); const total = round2(items.reduce((sum, line) => sum + line.amount, 0)); return { code: repeat.name, customer: { code: invoice.customer, name: invoice.customer_name ?? invoice.customer }, name: String((repeat as unknown as Record<string, unknown>).subject ?? repeat.name), interval: String(repeat.frequency ?? "Monthly").toLowerCase() as RecurringInterval, dayOfPeriod: Number(repeat.repeat_on_day ?? 1), currency: invoice.currency ?? "USD", summary: { subtotal: total, discount: 0, tax: 0, total: Math.abs(Number(invoice.grand_total ?? total)) }, items, nextRun: toIso(repeat.next_schedule_date ?? repeat.start_date), lastRun: null, status: repeat.status === "Completed" ? "ended" : repeat.disabled ? "paused" : "active", notes: invoice.remarks, createdAt: toIso(repeat.creation), updatedAt: toIso(repeat.modified) }; }
}

function toCreditNote(doc: ErpCreditNoteInvoice): CreditNote { const items = toLines(doc.items, true); const total = Math.abs(Number(doc.grand_total ?? items.reduce((sum, line) => sum + line.amount, 0))); return { code: doc.name, invoiceCode: doc.return_against ?? "", customer: { code: doc.customer, name: doc.customer_name ?? doc.customer }, status: creditStatus(doc), date: toIso(doc.posting_date), currency: doc.currency ?? "USD", summary: { subtotal: total, discount: 0, tax: 0, total }, items, reason: doc.remarks || undefined, createdAt: toIso(doc.creation), updatedAt: toIso(doc.modified) }; }
function toLines(lines: ErpCreditNoteInvoice["items"], absolute: boolean): DocLine[] { return (lines ?? []).map((line, index) => { const qty = absolute ? Math.abs(Number(line.qty ?? 0)) : Number(line.qty ?? 0); const rate = Math.abs(Number(line.rate ?? 0)); return { lineNo: index + 1, product: line.item_code, name: line.item_name ?? line.item_code, uom: line.uom ?? "pcs", qty, rate, amount: round2(qty * rate) }; }); }
function creditStatus(doc: ErpCreditNoteInvoice): CreditNoteStatus { if (doc.docstatus === 2) return "void"; if (doc.docstatus === 0) return "draft"; return Math.abs(Number(doc.outstanding_amount ?? 0)) < 0.001 ? "applied" : "issued"; }
function round2(value: number): number { return Math.round(value * 100) / 100; }
function unprocessable(message: string): ApiException { return new ApiException({ code: ErrorCode.UNPROCESSABLE, status: 422, message }); }
function notFound(label: string): ApiException { return new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `${label} not found` }); }
