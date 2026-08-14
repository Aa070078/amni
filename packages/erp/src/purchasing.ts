import type { ErpClient } from "./client.js";
import type { DocStatus } from "./types.js";

/**
 * M5-004 (Track B): typed domain surface for the purchasing side of ERPNext.
 *
 * Same conventions as `sales.ts`: `*_FIELDS` maps platform contract fields to
 * real Frappe fields, `build<Doc>()` helpers produce ERPNext doc bodies, and
 * the client wrappers pin the doctype so the API services in M5-005 never
 * spell out a doctype string themselves.
 *
 * Everything here is additive; the raw ErpClient remains the transport and
 * tenant resolution still happens through `createErpClientForTenant`.
 */

export const PURCHASING_DOCTYPE = {
  supplier: "Supplier",
  purchaseOrder: "Purchase Order",
  purchaseInvoice: "Purchase Invoice",
} as const;

/**
 * Product catalog doctype referenced by purchasing docs. Track A's inventory
 * module owns the fuller Item surface (inventory.ts); this constant only
 * exists so the purchasing services can point at the catalog without
 * importing across track files.
 */
export const CATALOG_DOCTYPE = {
  item: "Item",
} as const;

/** Platform contract field -> Frappe field for the Supplier doctype. */
export const SUPPLIER_FIELDS = {
  name: "supplier_name",
  group: "supplier_group",
  email: "email_id",
  phone: "mobile_no",
  currency: "default_currency",
  paymentTerms: "payment_terms",
  taxId: "tax_id",
  status: "disabled",
  outstanding: "outstanding_amount",
  totalPurchases: "total_receipt_amount",
} as const;

/** Platform contract field -> Frappe field for the Purchase Order doctype. */
export const PURCHASE_ORDER_FIELDS = {
  supplier: "supplier",
  date: "transaction_date",
  expectedDate: "schedule_date",
  currency: "currency",
  notes: "notes",
  owner: "owner",
} as const;

/** Platform contract field -> Frappe field for the Purchase Invoice doctype. */
export const PURCHASE_INVOICE_FIELDS = {
  supplier: "supplier",
  date: "posting_date",
  dueDate: "due_date",
  currency: "currency",
  purchaseOrder: "purchase_order",
  notes: "remarks",
} as const;

export interface ErpSupplierDoc {
  name: string;
  supplier_name: string;
  supplier_group?: string;
  email_id?: string;
  mobile_no?: string;
  default_currency?: string;
  payment_terms?: string;
  tax_id?: string;
  disabled?: number;
  outstanding_amount?: number;
  total_receipt_amount?: number;
  docstatus?: DocStatus;
}

export interface ErpPurchaseOrderDoc {
  name: string;
  supplier: string;
  supplier_name?: string;
  transaction_date?: string;
  schedule_date?: string | null;
  currency?: string;
  grand_total?: number;
  notes?: string;
  owner?: string;
  status?: string;
  docstatus?: DocStatus;
  items: ErpDocLine[];
}

export interface ErpPurchaseInvoiceDoc {
  name: string;
  supplier: string;
  supplier_name?: string;
  posting_date?: string;
  due_date?: string;
  currency?: string;
  grand_total?: number;
  outstanding_amount?: number;
  purchase_order?: string;
  remarks?: string;
  status?: string;
  docstatus?: DocStatus;
  items: ErpDocLine[];
}

/** Same item-line shape as the sales side so both tracks agree on doctype lines. */
export interface ErpDocLine {
  item_code: string;
  item_name?: string;
  description?: string;
  qty: number;
  rate: number;
  amount: number;
  uom: string;
}

export interface SupplierInput {
  name: string;
  group?: string;
  email?: string;
  phone?: string;
  currency?: string;
  paymentTerms?: string;
  taxId?: string;
  status?: "active" | "inactive";
}

export interface DocLineInput {
  product: string;
  name?: string;
  uom?: string;
  qty: number;
  rate: number;
}

export interface PurchaseOrderInput {
  supplier: string;
  supplierName?: string;
  date?: string;
  expectedDate?: string | null;
  currency?: string;
  notes?: string;
  owner?: string;
  items: DocLineInput[];
}

export interface PurchaseInvoiceInput {
  supplier: string;
  supplierName?: string;
  date?: string;
  dueDate?: string;
  currency?: string;
  purchaseOrder?: string;
  notes?: string;
  items: DocLineInput[];
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

export function buildSupplierDoc(input: SupplierInput): Record<string, unknown> {
  return {
    [SUPPLIER_FIELDS.name]: input.name,
    [SUPPLIER_FIELDS.group]: input.group ?? "General",
    [SUPPLIER_FIELDS.email]: input.email,
    [SUPPLIER_FIELDS.phone]: input.phone,
    [SUPPLIER_FIELDS.currency]: input.currency ?? "USD",
    [SUPPLIER_FIELDS.paymentTerms]: input.paymentTerms,
    [SUPPLIER_FIELDS.taxId]: input.taxId,
    [SUPPLIER_FIELDS.status]: erpStatus(input.status !== "inactive"),
  };
}

export function buildPurchaseOrderDoc(input: PurchaseOrderInput): Record<string, unknown> {
  const lines = input.items.map(toErpLine);
  return {
    [PURCHASE_ORDER_FIELDS.supplier]: input.supplier,
    supplier_name: input.supplierName,
    [PURCHASE_ORDER_FIELDS.date]: input.date,
    [PURCHASE_ORDER_FIELDS.expectedDate]: input.expectedDate,
    [PURCHASE_ORDER_FIELDS.currency]: input.currency ?? "USD",
    [PURCHASE_ORDER_FIELDS.notes]: input.notes,
    [PURCHASE_ORDER_FIELDS.owner]: input.owner,
    items: lines,
    grand_total: Math.round(lines.reduce((sum, line) => sum + line.amount, 0) * 100) / 100,
    docstatus: 0,
  };
}

export function buildPurchaseInvoiceDoc(input: PurchaseInvoiceInput): Record<string, unknown> {
  const lines = input.items.map(toErpLine);
  return {
    [PURCHASE_INVOICE_FIELDS.supplier]: input.supplier,
    supplier_name: input.supplierName,
    [PURCHASE_INVOICE_FIELDS.date]: input.date,
    [PURCHASE_INVOICE_FIELDS.dueDate]: input.dueDate,
    [PURCHASE_INVOICE_FIELDS.currency]: input.currency ?? "USD",
    [PURCHASE_INVOICE_FIELDS.purchaseOrder]: input.purchaseOrder,
    [PURCHASE_INVOICE_FIELDS.notes]: input.notes,
    items: lines,
    grand_total: Math.round(lines.reduce((sum, line) => sum + line.amount, 0) * 100) / 100,
    docstatus: 0,
  };
}

export async function findSupplierByName(client: ErpClient, name: string): Promise<ErpSupplierDoc | undefined> {
  const { items } = await client.list<ErpSupplierDoc>(PURCHASING_DOCTYPE.supplier, {
    filters: { supplier_name: name },
    fields: ["name", "supplier_name", "supplier_group", "email_id", "disabled"],
    limitPageLength: 1,
  });
  return items[0];
}

export async function createSupplier(client: ErpClient, input: SupplierInput): Promise<ErpSupplierDoc> {
  return client.create<ErpSupplierDoc>(PURCHASING_DOCTYPE.supplier, buildSupplierDoc(input));
}

export async function createPurchaseOrder(client: ErpClient, input: PurchaseOrderInput): Promise<ErpPurchaseOrderDoc> {
  return client.create<ErpPurchaseOrderDoc>(PURCHASING_DOCTYPE.purchaseOrder, buildPurchaseOrderDoc(input));
}

export async function submitPurchaseOrder(client: ErpClient, name: string): Promise<ErpPurchaseOrderDoc> {
  return client.submit<ErpPurchaseOrderDoc>(PURCHASING_DOCTYPE.purchaseOrder, name);
}

export async function cancelPurchaseOrder(client: ErpClient, name: string): Promise<ErpPurchaseOrderDoc> {
  return client.cancel<ErpPurchaseOrderDoc>(PURCHASING_DOCTYPE.purchaseOrder, name);
}

export async function createPurchaseInvoice(client: ErpClient, input: PurchaseInvoiceInput): Promise<ErpPurchaseInvoiceDoc> {
  return client.create<ErpPurchaseInvoiceDoc>(PURCHASING_DOCTYPE.purchaseInvoice, buildPurchaseInvoiceDoc(input));
}

export async function submitPurchaseInvoice(client: ErpClient, name: string): Promise<ErpPurchaseInvoiceDoc> {
  return client.submit<ErpPurchaseInvoiceDoc>(PURCHASING_DOCTYPE.purchaseInvoice, name);
}

export async function cancelPurchaseInvoice(client: ErpClient, name: string): Promise<ErpPurchaseInvoiceDoc> {
  return client.cancel<ErpPurchaseInvoiceDoc>(PURCHASING_DOCTYPE.purchaseInvoice, name);
}
