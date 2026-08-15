import { Injectable } from "@nestjs/common";
import {
  CATALOG_DOCTYPE,
  PURCHASING_DOCTYPE,
  PURCHASE_INVOICE_FIELDS,
  buildPaymentEntryDoc,
  buildPurchaseInvoiceDoc,
  ErpError,
} from "@amni/erp";
import {
  ErrorCode,
  type CreateDocLine,
  type CreatePurchaseInvoiceInput,
  type DocLine,
  type DocSummary,
  type PurchaseInvoice,
  type PurchaseInvoiceListQuery,
  type PurchaseInvoiceListResponse,
  type PurchaseInvoiceStatus,
  type RecordPaymentInput,
  type UpdatePurchaseInvoiceInput,
} from "@amni/shared";

import { ApiException } from "../common/api.exception";
import type { GatewayRequestMeta, GatewayUser } from "../erp-gateway/erp-gateway.service";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ErpGatewayService } from "../erp-gateway/erp-gateway.service";

const DAY_MS = 86_400_000;
const round2 = (value: number): number => Math.round(value * 100) / 100;

const SORT_WHITELIST = new Set([
  "code",
  "supplier",
  "date",
  "dueDate",
  "total",
  "amountPaid",
  "status",
  "owner",
  "createdAt",
  "updatedAt",
]);

const LIST_FIELDS = [
  "name",
  PURCHASE_INVOICE_FIELDS.supplier,
  "supplier_name",
  PURCHASE_INVOICE_FIELDS.date,
  PURCHASE_INVOICE_FIELDS.dueDate,
  PURCHASE_INVOICE_FIELDS.currency,
  "grand_total",
  "outstanding_amount",
  PURCHASE_INVOICE_FIELDS.purchaseOrder,
  PURCHASE_INVOICE_FIELDS.notes,
  "status",
  "docstatus",
  "items",
  "creation",
  "modified",
];

export interface SupplierOption {
  code: string;
  name: string;
}

export interface ProductOption {
  code: string;
  name: string;
  uom: string;
  rate: number;
}

export interface PurchaseInvoiceOptions {
  suppliers: SupplierOption[];
  products: ProductOption[];
}

function notFound(code: string): ApiException {
  return new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Purchase invoice ${code} not found` });
}

/**
 * Maps an ERPNext Purchase Invoice (status string + docstatus) onto the
 * platform contract statuses. ERPNext derives the payment statuses; only
 * draft/submitted/cancelled map 1:1 and the rest are direct ERPNext values.
 */
function toStatus(docstatus: unknown, status: unknown): PurchaseInvoiceStatus {
  if (Number(docstatus) === 2) return "cancelled";
  if (Number(docstatus) === 0) return "draft";
  switch (String(status)) {
    case "Paid":
      return "paid";
    case "Partially Paid":
      return "partially_paid";
    case "Overdue":
      return "overdue";
    default:
      return "submitted";
  }
}

function toLine(line: Record<string, unknown>, lineNo: number): DocLine {
  const qty = Number(line.qty ?? 0);
  const rate = Number(line.rate ?? 0);
  return {
    lineNo,
    product: String(line.item_code ?? ""),
    name: line.item_name != null ? String(line.item_name) : String(line.item_code ?? ""),
    uom: line.uom != null ? String(line.uom) : "pcs",
    qty,
    rate,
    amount: round2(qty * rate),
  };
}

function toSummary(lines: DocLine[], grandTotal: unknown): DocSummary {
  const subtotal = round2(lines.reduce((sum, item) => sum + item.amount, 0));
  return { subtotal, discount: 0, tax: 0, total: grandTotal != null ? Number(grandTotal) : subtotal };
}

function toPurchaseInvoice(doc: Record<string, unknown>): PurchaseInvoice {
  const now = new Date().toISOString();
  const lines = Array.isArray(doc.items) ? doc.items.map((line, index) => toLine(line as Record<string, unknown>, index + 1)) : [];
  const grandTotal = doc.grand_total != null ? Number(doc.grand_total) : round2(lines.reduce((sum, item) => sum + item.amount, 0));
  const outstanding = doc.outstanding_amount != null ? Number(doc.outstanding_amount) : grandTotal;
  return {
    code: String(doc.name),
    supplier: {
      code: String(doc.supplier ?? ""),
      name: doc.supplier_name != null ? String(doc.supplier_name) : String(doc.supplier ?? ""),
    },
    status: toStatus(doc.docstatus, doc.status),
    date: doc.posting_date != null ? String(doc.posting_date) : now,
    dueDate: doc.due_date != null ? String(doc.due_date) : now,
    currency: doc.currency != null ? String(doc.currency) : "USD",
    summary: toSummary(lines, grandTotal),
    items: lines,
    amountPaid: round2(grandTotal - outstanding),
    owner: doc.owner != null ? String(doc.owner) : undefined,
    purchaseOrderCode: doc.purchase_order != null ? String(doc.purchase_order) : undefined,
    notes: doc.remarks != null ? String(doc.remarks) : undefined,
    createdAt: doc.creation != null ? String(doc.creation) : now,
    updatedAt: doc.modified != null ? String(doc.modified) : now,
  };
}

function buildLines(inputs: CreateDocLine[], products: Map<string, ProductOption>): DocLine[] {
  return inputs.map((input, index) => ({
    lineNo: index + 1,
    product: input.product,
    name: input.name ?? products.get(input.product)?.name ?? input.product,
    uom: input.uom ?? products.get(input.product)?.uom ?? "pcs",
    qty: input.qty,
    rate: input.rate,
    amount: round2(input.qty * input.rate),
  }));
}

function sortValue(invoice: PurchaseInvoice, sortBy: string): unknown {
  if (sortBy === "supplier") return invoice.supplier.name;
  if (sortBy === "total") return invoice.summary.total;
  return invoice[sortBy as keyof PurchaseInvoice];
}

/**
 * Purchase-invoices surface over the tenant's real ERPNext site (M5-005).
 * Same wiring as the other purchasing modules: tenant from Membership, code
 * IS the ERPNext doc name, mutations audited. Payments create and submit a
 * Payment Entry (Pay/Supplier) through the gateway, matching the finance
 * domain's recordPaymentEntry flow, then re-read the invoice so amountPaid
 * reflects the ERPNext outstanding_amount.
 */
@Injectable()
export class PurchaseInvoicesService {
  constructor(private readonly gateway: ErpGatewayService) {}

  async options(user: GatewayUser, meta: GatewayRequestMeta): Promise<PurchaseInvoiceOptions> {
    const [supplierDocs, productDocs] = await Promise.all([
      this.gateway.list(user, meta, PURCHASING_DOCTYPE.supplier, {
        fields: ["name", "supplier_name"],
        limitPageLength: 500,
      }),
      this.gateway.list(user, meta, CATALOG_DOCTYPE.item, {
        fields: ["name", "item_code", "item_name", "stock_uom", "standard_rate"],
        limitPageLength: 500,
      }),
    ]);
    return {
      suppliers: supplierDocs.items.map((doc) => ({
        code: String(doc.name),
        name: doc.supplier_name != null ? String(doc.supplier_name) : String(doc.name),
      })),
      products: productDocs.items.map((doc) => ({
        code: String(doc.item_code ?? doc.name),
        name: doc.item_name != null ? String(doc.item_name) : String(doc.name),
        uom: doc.stock_uom != null ? String(doc.stock_uom) : "pcs",
        rate: Number(doc.standard_rate ?? 0),
      })),
    };
  }

  async list(user: GatewayUser, meta: GatewayRequestMeta, query: PurchaseInvoiceListQuery): Promise<PurchaseInvoiceListResponse> {
    const { items } = await this.gateway.list(user, meta, PURCHASING_DOCTYPE.purchaseInvoice, {
      fields: LIST_FIELDS,
      limitPageLength: 500,
    });
    const records = items.map(toPurchaseInvoice);

    const q = (query.q ?? "").toLowerCase().trim();
    const filtered = records.filter((invoice) => {
      if (query.status && invoice.status !== query.status) return false;
      if (!q) return true;
      return [invoice.code, invoice.supplier.code, invoice.supplier.name, invoice.owner ?? "", invoice.notes ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });

    const sortBy = query.sortBy && SORT_WHITELIST.has(query.sortBy) ? query.sortBy : "createdAt";
    const sortDir = query.sortDir === "asc" ? 1 : -1;
    const sorted = [...filtered].sort((a, b) => {
      const aValue = sortValue(a, sortBy);
      const bValue = sortValue(b, sortBy);
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

  async detail(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<PurchaseInvoice> {
    try {
      const doc = await this.gateway.get(user, meta, PURCHASING_DOCTYPE.purchaseInvoice, code);
      return toPurchaseInvoice(doc);
    } catch (err) {
      if (err instanceof ErpError && err.code === ErrorCode.ERP_NOT_FOUND) throw notFound(code);
      throw err;
    }
  }

  async create(user: GatewayUser, meta: GatewayRequestMeta, input: CreatePurchaseInvoiceInput): Promise<PurchaseInvoice> {
    const [code, products, supplier] = await Promise.all([
      this.nextCode(user, meta),
      this.listProducts(user, meta),
      this.resolveSupplier(user, meta, input.supplierCode),
    ]);
    const lines = buildLines(input.items, products);
    const date = input.date ?? new Date().toISOString();
    const doc = await this.gateway.create(user, meta, PURCHASING_DOCTYPE.purchaseInvoice, {
      name: code,
      ...buildPurchaseInvoiceDoc({
        supplier: supplier.code,
        supplierName: supplier.name,
        date,
        dueDate: input.dueDate ?? new Date(new Date(date).getTime() + 30 * DAY_MS).toISOString(),
        currency: input.currency,
        purchaseOrder: input.purchaseOrderCode,
        notes: input.notes ?? "",
        items: lines.map((line) => ({ product: line.product, name: line.name, uom: line.uom, qty: line.qty, rate: line.rate })),
      }),
    });
    return toPurchaseInvoice(doc);
  }

  async update(user: GatewayUser, meta: GatewayRequestMeta, code: string, input: UpdatePurchaseInvoiceInput): Promise<PurchaseInvoice> {
    const products = await this.listProducts(user, meta);
    const doc = await this.gateway.update(user, meta, PURCHASING_DOCTYPE.purchaseInvoice, code, undefined, {
      ...(input.supplierCode !== undefined ? { [PURCHASE_INVOICE_FIELDS.supplier]: input.supplierCode } : {}),
      ...(input.date !== undefined ? { [PURCHASE_INVOICE_FIELDS.date]: input.date } : {}),
      ...(input.dueDate !== undefined ? { [PURCHASE_INVOICE_FIELDS.dueDate]: input.dueDate } : {}),
      ...(input.currency !== undefined ? { [PURCHASE_INVOICE_FIELDS.currency]: input.currency } : {}),
      ...(input.purchaseOrderCode !== undefined ? { [PURCHASE_INVOICE_FIELDS.purchaseOrder]: input.purchaseOrderCode } : {}),
      ...(input.notes !== undefined ? { [PURCHASE_INVOICE_FIELDS.notes]: input.notes } : {}),
      ...(input.items !== undefined
        ? { items: buildLines(input.items, products).map((line) => ({ item_code: line.product, item_name: line.name, qty: line.qty, rate: line.rate, uom: line.uom, amount: line.amount })) }
        : {}),
    });
    return toPurchaseInvoice(doc);
  }

  async changeStatus(user: GatewayUser, meta: GatewayRequestMeta, code: string, input: { status: PurchaseInvoiceStatus }): Promise<PurchaseInvoice> {
    let doc: Record<string, unknown>;
    if (input.status === "submitted") {
      doc = await this.gateway.update(user, meta, PURCHASING_DOCTYPE.purchaseInvoice, code, "submit", {});
    } else if (input.status === "cancelled") {
      doc = await this.gateway.update(user, meta, PURCHASING_DOCTYPE.purchaseInvoice, code, "cancel", {});
    } else {
      throw new ApiException({
        code: ErrorCode.VALIDATION,
        status: 400,
        message: "Purchase invoice status is derived from ERPNext; only submitted and cancelled can be set",
      });
    }
    return toPurchaseInvoice(doc);
  }

  async recordPayment(user: GatewayUser, meta: GatewayRequestMeta, code: string, input: RecordPaymentInput): Promise<PurchaseInvoice> {
    const payment = await this.gateway.create(user, meta, "Payment Entry", {
      ...buildPaymentEntryDoc({
        party: code,
        partyType: "Supplier",
        paymentType: "Pay",
        paidAmount: input.amount,
        method: input.method,
        date: input.date,
        reference: input.reference,
      }),
    });
    await this.gateway.update(user, meta, "Payment Entry", String(payment.name), "submit", {});
    const doc = await this.gateway.get(user, meta, PURCHASING_DOCTYPE.purchaseInvoice, code);
    return toPurchaseInvoice(doc);
  }

  async remove(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<void> {
    await this.gateway.remove(user, meta, PURCHASING_DOCTYPE.purchaseInvoice, code);
  }

  private async listProducts(user: GatewayUser, meta: GatewayRequestMeta): Promise<Map<string, ProductOption>> {
    const { items } = await this.gateway.list(user, meta, CATALOG_DOCTYPE.item, {
      fields: ["name", "item_code", "item_name", "stock_uom", "standard_rate"],
      limitPageLength: 500,
    });
    return new Map(
      items.map((doc) => [
        String(doc.item_code ?? doc.name),
        {
          code: String(doc.item_code ?? doc.name),
          name: doc.item_name != null ? String(doc.item_name) : String(doc.name),
          uom: doc.stock_uom != null ? String(doc.stock_uom) : "pcs",
          rate: Number(doc.standard_rate ?? 0),
        },
      ]),
    );
  }

  private async resolveSupplier(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<SupplierOption> {
    const { items } = await this.gateway.list(user, meta, PURCHASING_DOCTYPE.supplier, {
      filters: { name: code },
      fields: ["name", "supplier_name"],
      limitPageLength: 1,
    });
    const found = items[0];
    if (!found) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Supplier ${code} not found` });
    }
    return { code: String(found.name), name: found.supplier_name != null ? String(found.supplier_name) : String(found.name) };
  }

  private async nextCode(user: GatewayUser, meta: GatewayRequestMeta): Promise<string> {
    const { items } = await this.gateway.list(user, meta, PURCHASING_DOCTYPE.purchaseInvoice, {
      fields: ["name"],
      limitPageLength: 500,
    });
    const max = items.reduce((highest, doc) => {
      const match = /^PINV-(\d{4})$/.exec(String(doc.name));
      const number = match ? Number(match[1]) : 0;
      return number > highest ? number : highest;
    }, 0);
    return `PINV-${String(max + 1).padStart(4, "0")}`;
  }
}
