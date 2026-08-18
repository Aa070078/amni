import type { ErpClient } from "./client.js";
import type { DocStatus } from "./types.js";

/**
 * M5-001 (Track A): typed domain surface for the sales side of ERPNext.
 *
 * Each doctype group has:
 *  - a `*_FIELDS` map from the platform contract field to the real Frappe
 *    field name (the same convention as `imports.ts`),
 *  - `build<Doc>()` helpers that turn platform inputs into ERPNext doc bodies,
 *  - thin client wrappers that resolve to the correct doctype so the API
 *    services in M5-002 never spell out a doctype string themselves.
 *
 * Everything here is additive; the raw ErpClient remains the transport and
 * tenant resolution still happens through `createErpClientForTenant`.
 */

export const SALES_DOCTYPE = {
  customer: "Customer",
  lead: "Lead",
  contact: "Contact",
  quotation: "Quotation",
  salesOrder: "Sales Order",
  salesInvoice: "Sales Invoice",
  paymentEntry: "Payment Entry",
} as const;

/** Platform contract field -> Frappe field for the Customer doctype. */
export const CUSTOMER_FIELDS = {
  name: "customer_name",
  type: "customer_type",
  group: "customer_group",
  territory: "territory",
  email: "email_id",
  phone: "mobile_no",
  currency: "default_currency",
  paymentTerms: "payment_terms",
  status: "disabled",
  outstanding: "outstanding_amount",
  totalSales: "total_sales_amount",
} as const;

/** Platform contract field -> Frappe field for the Lead doctype. */
export const LEAD_FIELDS = {
  company: "company_name",
  contactName: "lead_name",
  contactEmail: "email_id",
  contactPhone: "phone",
  source: "source",
  stage: "status",
  expectedClose: "expected_close_date",
  owner: "lead_owner",
  notes: "notes",
} as const;

/** Platform contract field -> Frappe field for the Contact doctype. */
export const CONTACT_FIELDS = {
  firstName: "first_name",
  lastName: "last_name",
  email: "email_id",
  mobileNo: "mobile_no",
  companyName: "company_name",
  department: "department",
  jobTitle: "designation",
} as const;

/** Platform contract field -> Frappe field for the Quotation doctype. */
export const QUOTATION_FIELDS = {
  customer: "customer",
  date: "transaction_date",
  validUntil: "valid_till",
  currency: "currency",
  notes: "notes",
  owner: "owner",
} as const;

/** Platform contract field -> Frappe field for the Sales Order doctype. */
export const SALES_ORDER_FIELDS = {
  customer: "customer",
  date: "transaction_date",
  deliveryDate: "delivery_date",
  currency: "currency",
  quotation: "quotation",
  notes: "notes",
  owner: "owner",
} as const;

/** Platform contract field -> Frappe field for the Sales Invoice doctype. */
export const SALES_INVOICE_FIELDS = {
  customer: "customer",
  date: "posting_date",
  dueDate: "due_date",
  currency: "currency",
  salesOrder: "sales_order",
  notes: "notes",
} as const;

/** Platform contract field -> Frappe field for the Payment Entry doctype. */
export const PAYMENT_ENTRY_FIELDS = {
  party: "party",
  paidAmount: "paid_amount",
  method: "mode_of_payment",
  date: "posting_date",
  reference: "reference_no",
  paidTo: "paid_to",
} as const;

export interface ErpDocLine {
  item_code: string;
  item_name?: string;
  description?: string;
  qty: number;
  rate: number;
  amount: number;
  uom: string;
}

export interface ErpCustomerDoc {
  name: string;
  customer_name: string;
  customer_type?: "Company" | "Individual";
  customer_group?: string;
  territory?: string;
  email_id?: string;
  mobile_no?: string;
  default_currency?: string;
  payment_terms?: string;
  disabled?: number;
  outstanding_amount?: number;
  total_sales_amount?: number;
  docstatus?: DocStatus;
}

export interface ErpLeadDoc {
  name: string;
  company_name?: string;
  lead_name?: string;
  email_id?: string;
  phone?: string;
  source?: string;
  status?: string;
  expected_close_date?: string | null;
  lead_owner?: string;
  notes?: string;
  docstatus?: DocStatus;
}

export interface ErpContactDoc {
  name: string;
  first_name?: string;
  last_name?: string;
  email_id?: string;
  mobile_no?: string;
  company_name?: string;
  department?: string;
  designation?: string;
  is_primary_contact?: number;
  docstatus?: DocStatus;
}

export interface ErpQuotationDoc {
  name: string;
  customer: string;
  transaction_date?: string;
  valid_till?: string | null;
  currency?: string;
  grand_total?: number;
  notes?: string;
  owner?: string;
  status?: string;
  docstatus?: DocStatus;
  items: ErpDocLine[];
}

export interface ErpSalesOrderDoc {
  name: string;
  customer: string;
  transaction_date?: string;
  delivery_date?: string | null;
  currency?: string;
  grand_total?: number;
  quotation?: string;
  notes?: string;
  owner?: string;
  status?: string;
  docstatus?: DocStatus;
  items: ErpDocLine[];
}

export interface ErpSalesInvoiceDoc {
  name: string;
  customer: string;
  posting_date?: string;
  due_date?: string;
  currency?: string;
  grand_total?: number;
  outstanding_amount?: number;
  sales_order?: string;
  notes?: string;
  status?: string;
  docstatus?: DocStatus;
  items: ErpDocLine[];
}

export interface ErpSalesPaymentEntryDoc {
  name: string;
  party: string;
  party_type: "Customer";
  payment_type: "Receive";
  paid_amount?: number;
  received_amount?: number;
  mode_of_payment?: string;
  posting_date?: string;
  reference_no?: string;
  paid_to?: string;
  docstatus?: DocStatus;
}

export interface CustomerInput {
  name: string;
  type?: "company" | "individual";
  group?: string;
  territory?: string;
  email?: string;
  phone?: string;
  currency?: string;
  paymentTerms?: string;
  status?: "active" | "inactive";
}

export interface LeadInput {
  company: string;
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  source?: string;
  stage?: string;
  expectedClose?: string | null;
  owner?: string;
  notes?: string;
}

export interface ContactInput {
  firstName: string;
  lastName?: string;
  email?: string;
  mobileNo?: string;
  companyName?: string;
  department?: string;
  jobTitle?: string;
}

export interface DocLineInput {
  product: string;
  name?: string;
  uom?: string;
  qty: number;
  rate: number;
}

function toErpLine(line: DocLineInput): ErpDocLine {
  const qty = line.qty;
  const rate = line.rate;
  return {
    item_code: line.product,
    item_name: line.name,
    qty,
    rate,
    amount: Math.round(qty * rate * 100) / 100,
    uom: line.uom ?? "pcs",
  };
}

function erpStatus(enabled: boolean): number {
  return enabled ? 0 : 1;
}

export function buildCustomerDoc(input: CustomerInput): Record<string, unknown> {
  return {
    [CUSTOMER_FIELDS.name]: input.name,
    [CUSTOMER_FIELDS.type]: input.type === "individual" ? "Individual" : "Company",
    [CUSTOMER_FIELDS.group]: input.group ?? "General",
    [CUSTOMER_FIELDS.territory]: input.territory,
    [CUSTOMER_FIELDS.email]: input.email,
    [CUSTOMER_FIELDS.phone]: input.phone,
    [CUSTOMER_FIELDS.currency]: input.currency ?? "USD",
    [CUSTOMER_FIELDS.paymentTerms]: input.paymentTerms,
    [CUSTOMER_FIELDS.status]: erpStatus(input.status !== "inactive"),
  };
}

export function buildLeadDoc(input: LeadInput): Record<string, unknown> {
  return {
    [LEAD_FIELDS.company]: input.company,
    [LEAD_FIELDS.contactName]: input.contactName,
    [LEAD_FIELDS.contactEmail]: input.contactEmail,
    [LEAD_FIELDS.contactPhone]: input.contactPhone,
    [LEAD_FIELDS.source]: input.source,
    [LEAD_FIELDS.stage]: input.stage,
    [LEAD_FIELDS.expectedClose]: input.expectedClose,
    [LEAD_FIELDS.owner]: input.owner,
    [LEAD_FIELDS.notes]: input.notes,
  };
}

export function buildContactDoc(input: ContactInput): Record<string, unknown> {
  return {
    [CONTACT_FIELDS.firstName]: input.firstName,
    [CONTACT_FIELDS.lastName]: input.lastName,
    [CONTACT_FIELDS.email]: input.email,
    [CONTACT_FIELDS.mobileNo]: input.mobileNo,
    [CONTACT_FIELDS.companyName]: input.companyName,
    [CONTACT_FIELDS.department]: input.department,
    [CONTACT_FIELDS.jobTitle]: input.jobTitle,
    is_primary_contact: 1,
  };
}

export interface QuotationInput {
  customer: string;
  date?: string;
  validUntil?: string | null;
  currency?: string;
  notes?: string;
  items: DocLineInput[];
}

export function buildQuotationDoc(input: QuotationInput): Record<string, unknown> {
  const lines = input.items.map(toErpLine);
  return {
    [QUOTATION_FIELDS.customer]: input.customer,
    [QUOTATION_FIELDS.date]: input.date,
    [QUOTATION_FIELDS.validUntil]: input.validUntil,
    [QUOTATION_FIELDS.currency]: input.currency ?? "USD",
    [QUOTATION_FIELDS.notes]: input.notes,
    items: lines,
    grand_total: Math.round(lines.reduce((sum, line) => sum + line.amount, 0) * 100) / 100,
  };
}

export interface SalesOrderInput extends QuotationInput {
  deliveryDate?: string | null;
  quotation?: string;
  owner?: string;
}

export function buildSalesOrderDoc(input: SalesOrderInput): Record<string, unknown> {
  const lines = input.items.map(toErpLine);
  return {
    [SALES_ORDER_FIELDS.customer]: input.customer,
    [SALES_ORDER_FIELDS.date]: input.date,
    [SALES_ORDER_FIELDS.deliveryDate]: input.deliveryDate,
    [SALES_ORDER_FIELDS.currency]: input.currency ?? "USD",
    [SALES_ORDER_FIELDS.quotation]: input.quotation,
    [SALES_ORDER_FIELDS.notes]: input.notes,
    [SALES_ORDER_FIELDS.owner]: input.owner,
    items: lines,
    grand_total: Math.round(lines.reduce((sum, line) => sum + line.amount, 0) * 100) / 100,
  };
}

export interface SalesInvoiceInput extends QuotationInput {
  dueDate?: string;
  salesOrder?: string;
}

export function buildSalesInvoiceDoc(input: SalesInvoiceInput): Record<string, unknown> {
  const lines = input.items.map(toErpLine);
  return {
    [SALES_INVOICE_FIELDS.customer]: input.customer,
    [SALES_INVOICE_FIELDS.date]: input.date,
    [SALES_INVOICE_FIELDS.dueDate]: input.dueDate,
    [SALES_INVOICE_FIELDS.currency]: input.currency ?? "USD",
    [SALES_INVOICE_FIELDS.salesOrder]: input.salesOrder,
    [SALES_INVOICE_FIELDS.notes]: input.notes,
    items: lines,
    grand_total: Math.round(lines.reduce((sum, line) => sum + line.amount, 0) * 100) / 100,
  };
}

export interface SalesPaymentEntryInput {
  party: string;
  paidAmount: number;
  invoice?: string;
  method?: string;
  date?: string;
  reference?: string;
  paidTo?: string;
}

export function buildSalesPaymentEntryDoc(input: SalesPaymentEntryInput): Record<string, unknown> {
  return {
    [PAYMENT_ENTRY_FIELDS.party]: input.party,
    [PAYMENT_ENTRY_FIELDS.paidAmount]: input.paidAmount,
    [PAYMENT_ENTRY_FIELDS.method]: input.method ?? "bank_transfer",
    [PAYMENT_ENTRY_FIELDS.date]: input.date,
    [PAYMENT_ENTRY_FIELDS.reference]: input.reference,
    [PAYMENT_ENTRY_FIELDS.paidTo]: input.paidTo,
    party_type: "Customer",
    payment_type: "Receive",
    references: input.invoice
      ? [
          {
            reference_doctype: SALES_DOCTYPE.salesInvoice,
            reference_name: input.invoice,
            allocated_amount: input.paidAmount,
          },
        ]
      : undefined,
  };
}

export async function findCustomerByName(client: ErpClient, name: string): Promise<ErpCustomerDoc | undefined> {
  const { items } = await client.list<ErpCustomerDoc>(SALES_DOCTYPE.customer, {
    filters: { customer_name: name },
    fields: ["name", "customer_name", "customer_type", "customer_group", "email_id", "disabled"],
    limitPageLength: 1,
  });
  return items[0];
}

export async function createCustomer(client: ErpClient, input: CustomerInput): Promise<ErpCustomerDoc> {
  return client.create<ErpCustomerDoc>(SALES_DOCTYPE.customer, buildCustomerDoc(input));
}

export async function createLead(client: ErpClient, input: LeadInput): Promise<ErpLeadDoc> {
  return client.create<ErpLeadDoc>(SALES_DOCTYPE.lead, buildLeadDoc(input));
}

export async function createContact(client: ErpClient, input: ContactInput): Promise<ErpContactDoc> {
  return client.create<ErpContactDoc>(SALES_DOCTYPE.contact, buildContactDoc(input));
}

export async function createQuotation(client: ErpClient, input: QuotationInput): Promise<ErpQuotationDoc> {
  return client.create<ErpQuotationDoc>(SALES_DOCTYPE.quotation, buildQuotationDoc(input));
}

export async function createSalesOrder(client: ErpClient, input: SalesOrderInput): Promise<ErpSalesOrderDoc> {
  return client.create<ErpSalesOrderDoc>(SALES_DOCTYPE.salesOrder, buildSalesOrderDoc(input));
}

export async function createSalesInvoice(client: ErpClient, input: SalesInvoiceInput): Promise<ErpSalesInvoiceDoc> {
  return client.create<ErpSalesInvoiceDoc>(SALES_DOCTYPE.salesInvoice, buildSalesInvoiceDoc(input));
}

export async function submitSalesOrder(client: ErpClient, name: string): Promise<ErpSalesOrderDoc> {
  return client.submit<ErpSalesOrderDoc>(SALES_DOCTYPE.salesOrder, name);
}

export async function submitSalesInvoice(client: ErpClient, name: string): Promise<ErpSalesInvoiceDoc> {
  return client.submit<ErpSalesInvoiceDoc>(SALES_DOCTYPE.salesInvoice, name);
}

export async function submitQuotation(client: ErpClient, name: string): Promise<ErpQuotationDoc> {
  return client.submit<ErpQuotationDoc>(SALES_DOCTYPE.quotation, name);
}

export async function cancelSalesOrder(client: ErpClient, name: string): Promise<ErpSalesOrderDoc> {
  return client.cancel<ErpSalesOrderDoc>(SALES_DOCTYPE.salesOrder, name);
}

export async function cancelSalesInvoice(client: ErpClient, name: string): Promise<ErpSalesInvoiceDoc> {
  return client.cancel<ErpSalesInvoiceDoc>(SALES_DOCTYPE.salesInvoice, name);
}

/**
 * Records a payment against a customer. Creates and submits a Payment Entry
 * of type Receive so the receivable ledger updates immediately.
 */
export async function recordSalesPaymentEntry(client: ErpClient, input: SalesPaymentEntryInput): Promise<ErpSalesPaymentEntryDoc> {
  const created = await client.create<ErpSalesPaymentEntryDoc>(SALES_DOCTYPE.paymentEntry, buildSalesPaymentEntryDoc(input));
  return client.submit<ErpSalesPaymentEntryDoc>(SALES_DOCTYPE.paymentEntry, created.name);
}

/**
 * Deals are backed by the Opportunity doctype (the same one ERPNext derives
 * from converted Leads), so the stage mapping stays congruent with `lead.ts`
 * (won=Converted, lost=Lost). Note that Opportunity.status only offers
 * Open / Quotation / Replied / Converted / Lost / Closed, so both in-flight
 * platform stages map onto that vocabulary and there is no `Qualified` /
 * `Opportunity` option here.
 */
export const OPPORTUNITY_DOCTYPE = "Opportunity" as const;

/** Platform contract field -> Frappe field for the Opportunity doctype. */
export const OpportunityFields = {
  title: "title",
  company: "customer_name",
  contactName: "contact_display",
  contactEmail: "contact_email",
  contactPhone: "contact_mobile",
  source: "source",
  stage: "status",
  expectedClose: "expected_closing",
  owner: "opportunity_owner",
  notes: "notes",
} as const;

export interface ErpOpportunityDoc {
  name: string;
  title?: string;
  customer_name?: string;
  lead_name?: string;
  contact_display?: string;
  contact_email?: string;
  contact_mobile?: string;
  source?: string;
  status?: string;
  expected_closing?: string | null;
  opportunity_owner?: string;
  notes?: string;
  docstatus?: DocStatus;
}

export interface OpportunityInput {
  title: string;
  company: string;
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  source?: string;
  stage?: string;
  expectedClose?: string | null;
  owner?: string;
  notes?: string;
}

export interface OpportunityDefaults {
  stage?: string;
  source?: string;
  owner?: string;
}

/**
 * Maps a platform deal create-input onto an Opportunity doc. `defaults`
 * supplies the ERP-level stage/status and owner that the platform leaves
 * unset; explicit input values always win.
 */
export function buildOpportunityDoc(input: OpportunityInput, defaults: OpportunityDefaults = {}): Record<string, unknown> {
  return {
    [OpportunityFields.title]: input.title,
    [OpportunityFields.company]: input.company,
    [OpportunityFields.contactName]: input.contactName,
    [OpportunityFields.contactEmail]: input.contactEmail,
    [OpportunityFields.contactPhone]: input.contactPhone,
    [OpportunityFields.source]: input.source ?? defaults.source,
    [OpportunityFields.stage]: input.stage ?? defaults.stage,
    [OpportunityFields.expectedClose]: input.expectedClose,
    [OpportunityFields.owner]: input.owner ?? defaults.owner,
    [OpportunityFields.notes]: input.notes,
  };
}
