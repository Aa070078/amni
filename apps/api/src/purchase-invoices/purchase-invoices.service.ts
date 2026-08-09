import { Injectable } from "@nestjs/common";
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

const DAY_MS = 86_400_000;
const iso = (daysAgo: number): string => new Date(Date.now() - daysAgo * DAY_MS).toISOString();
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

const SEED_SUPPLIERS: SupplierOption[] = [
  { code: "SUP-0001", name: "Nordic Timberworks" },
  { code: "SUP-0002", name: "Fleetline Metals" },
  { code: "SUP-0003", name: "Comet Office Supply" },
  { code: "SUP-0004", name: "Hale Lighting Co." },
  { code: "SUP-0005", name: "PackRight Logistics" },
  { code: "SUP-0006", name: "Beacon Textiles" },
  { code: "SUP-0007", name: "Vertex Hardware" },
];

const SEED_PRODUCTS: ProductOption[] = [
  { code: "PRD-0001", name: "Alderwood standing desk", uom: "pcs", rate: 520 },
  { code: "PRD-0002", name: "Aria ergonomic chair", uom: "pcs", rate: 245 },
  { code: "PRD-0003", name: "Lumen task lamp", uom: "pcs", rate: 34 },
  { code: "PRD-0004", name: "Linea lateral file cabinet", uom: "pcs", rate: 138 },
  { code: "PRD-0005", name: "Boardroom conference table", uom: "pcs", rate: 890 },
  { code: "PRD-0006", name: "Serene modular sofa set", uom: "set", rate: 760 },
  { code: "PRD-0007", name: "Acoustic partition panel", uom: "pcs", rate: 172 },
  { code: "PRD-0008", name: "Flux dual monitor arm", uom: "pcs", rate: 58 },
];

const supplier = (code: string): SupplierOption => {
  const found = SEED_SUPPLIERS.find((entry) => entry.code === code);
  if (!found) {
    throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Supplier ${code} not found` });
  }
  return found;
};

const line = (
  lineNo: number,
  product: string,
  name: string,
  uom: string,
  qty: number,
  rate: number,
): DocLine => ({
  lineNo,
  product,
  name,
  uom,
  qty,
  rate,
  amount: round2(qty * rate),
});

function summarize(lines: DocLine[], discount = 0, tax = 0): DocSummary {
  const subtotal = round2(lines.reduce((sum, item) => sum + item.amount, 0));
  return { subtotal, discount, tax, total: round2(subtotal - discount + tax) };
}

const SEED: PurchaseInvoice[] = [
  {
    code: "PINV-0001",
    supplier: supplier("SUP-0001"),
    status: "paid",
    date: iso(58),
    dueDate: iso(28),
    currency: "USD",
    summary: summarize([
      line(1, "PRD-0001", "Alderwood standing desk", "pcs", 10, 520),
      line(2, "PRD-0002", "Aria ergonomic chair", "pcs", 24, 245),
    ]),
    items: [
      line(1, "PRD-0001", "Alderwood standing desk", "pcs", 10, 520),
      line(2, "PRD-0002", "Aria ergonomic chair", "pcs", 24, 245),
    ],
    amountPaid: 11080,
    owner: "Amara Osei",
    purchaseOrderCode: "PO-0001",
    notes: "Paid within discount window.",
    createdAt: iso(58),
    updatedAt: iso(28),
  },
  {
    code: "PINV-0002",
    supplier: supplier("SUP-0002"),
    status: "overdue",
    date: iso(50),
    dueDate: iso(10),
    currency: "USD",
    summary: summarize([
      line(1, "PRD-0004", "Linea lateral file cabinet", "pcs", 12, 138),
      line(2, "PRD-0007", "Acoustic partition panel", "pcs", 8, 172),
    ]),
    items: [
      line(1, "PRD-0004", "Linea lateral file cabinet", "pcs", 12, 138),
      line(2, "PRD-0007", "Acoustic partition panel", "pcs", 8, 172),
    ],
    amountPaid: 0,
    owner: "Theo Lindqvist",
    purchaseOrderCode: "PO-0003",
    notes: "Follow up on outstanding balance.",
    createdAt: iso(50),
    updatedAt: iso(5),
  },
  {
    code: "PINV-0003",
    supplier: supplier("SUP-0004"),
    status: "submitted",
    date: iso(40),
    dueDate: iso(21),
    currency: "USD",
    summary: summarize([
      line(1, "PRD-0003", "Lumen task lamp", "pcs", 60, 34),
      line(2, "PRD-0008", "Flux dual monitor arm", "pcs", 20, 58),
    ]),
    items: [
      line(1, "PRD-0003", "Lumen task lamp", "pcs", 60, 34),
      line(2, "PRD-0008", "Flux dual monitor arm", "pcs", 20, 58),
    ],
    amountPaid: 0,
    owner: "Amara Osei",
    purchaseOrderCode: "PO-0002",
    notes: "Due 30 days from invoice date.",
    createdAt: iso(40),
    updatedAt: iso(9),
  },
  {
    code: "PINV-0004",
    supplier: supplier("SUP-0005"),
    status: "partially_paid",
    date: iso(30),
    dueDate: iso(8),
    currency: "USD",
    summary: summarize([
      line(1, "PRD-0006", "Serene modular sofa set", "set", 3, 760),
    ]),
    items: [
      line(1, "PRD-0006", "Serene modular sofa set", "set", 3, 760),
    ],
    amountPaid: 1000,
    owner: "Amara Osei",
    notes: "Partial payment made against delivery.",
    createdAt: iso(30),
    updatedAt: iso(6),
  },
  {
    code: "PINV-0005",
    supplier: supplier("SUP-0003"),
    status: "paid",
    date: iso(20),
    dueDate: iso(10),
    currency: "USD",
    summary: summarize([
      line(1, "PRD-0003", "Lumen task lamp", "pcs", 40, 34),
    ]),
    items: [
      line(1, "PRD-0003", "Lumen task lamp", "pcs", 40, 34),
    ],
    amountPaid: 1360,
    owner: "Theo Lindqvist",
    purchaseOrderCode: "PO-0005",
    notes: "",
    createdAt: iso(20),
    updatedAt: iso(10),
  },
  {
    code: "PINV-0006",
    supplier: supplier("SUP-0006"),
    status: "submitted",
    date: iso(5),
    dueDate: iso(26),
    currency: "USD",
    summary: summarize([
      line(1, "PRD-0007", "Acoustic partition panel", "pcs", 16, 172),
    ]),
    items: [
      line(1, "PRD-0007", "Acoustic partition panel", "pcs", 16, 172),
    ],
    amountPaid: 0,
    owner: "Amara Osei",
    purchaseOrderCode: "PO-0006",
    notes: "",
    createdAt: iso(2),
    updatedAt: iso(1),
  },
];

function buildLines(inputs: CreateDocLine[], productName: (code: string) => string | undefined): DocLine[] {
  return inputs.map((input, index) => ({
    lineNo: index + 1,
    product: input.product,
    name: input.name ?? productName(input.product) ?? input.product,
    uom: input.uom ?? "pcs",
    qty: input.qty,
    rate: input.rate,
    amount: round2(input.qty * input.rate),
  }));
}

function nextCode(records: PurchaseInvoice[]): string {
  const max = records.reduce((highest, invoice) => {
    const number = Number(invoice.code.slice(5));
    return number > highest ? number : highest;
  }, 0);
  return `PINV-${String(max + 1).padStart(4, "0")}`;
}

function sortValue(invoice: PurchaseInvoice, sortBy: string): unknown {
  if (sortBy === "supplier") return invoice.supplier.name;
  if (sortBy === "total") return invoice.summary.total;
  return invoice[sortBy as keyof PurchaseInvoice];
}

/**
 * Reference data for the Demo Co tenant. This module is the only purchase-invoice
 * surface until the ERP gateway lands (M5); endpoints then read from the
 * tenant ERPNext site and keep the same contract.
 */
@Injectable()
export class PurchaseInvoicesService {
  private records: PurchaseInvoice[] = structuredClone(SEED);

  options(): PurchaseInvoiceOptions {
    return { suppliers: SEED_SUPPLIERS, products: SEED_PRODUCTS };
  }

  list(query: PurchaseInvoiceListQuery): PurchaseInvoiceListResponse {
    const q = (query.q ?? "").toLowerCase().trim();
    const filtered = this.records.filter((invoice) => {
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

  detail(code: string): PurchaseInvoice {
    const invoice = this.records.find((record) => record.code === code);
    if (!invoice) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Purchase invoice ${code} not found` });
    }
    return invoice;
  }

  create(input: CreatePurchaseInvoiceInput): PurchaseInvoice {
    const lines = buildLines(input.items, (code) => SEED_PRODUCTS.find((product) => product.code === code)?.name);
    const date = input.date ?? new Date().toISOString();
    const invoice: PurchaseInvoice = {
      code: nextCode(this.records),
      supplier: supplier(input.supplierCode),
      status: "draft",
      date,
      dueDate: input.dueDate ?? new Date(new Date(date).getTime() + 30 * DAY_MS).toISOString(),
      currency: input.currency ?? "USD",
      summary: summarize(lines),
      items: lines,
      amountPaid: 0,
      owner: "Amara Osei",
      purchaseOrderCode: input.purchaseOrderCode,
      notes: input.notes ?? "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.records.push(invoice);
    return invoice;
  }

  update(code: string, input: UpdatePurchaseInvoiceInput): PurchaseInvoice {
    const invoice = this.records.find((record) => record.code === code);
    if (!invoice) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Purchase invoice ${code} not found` });
    }
    if (input.supplierCode !== undefined) invoice.supplier = supplier(input.supplierCode);
    if (input.date !== undefined) invoice.date = input.date;
    if (input.dueDate !== undefined) invoice.dueDate = input.dueDate;
    if (input.currency !== undefined) invoice.currency = input.currency;
    if (input.purchaseOrderCode !== undefined) invoice.purchaseOrderCode = input.purchaseOrderCode;
    if (input.notes !== undefined) invoice.notes = input.notes;
    if (input.items !== undefined) {
      invoice.items = buildLines(input.items, (code) => SEED_PRODUCTS.find((product) => product.code === code)?.name);
      invoice.summary = summarize(invoice.items);
    }
    invoice.updatedAt = new Date().toISOString();
    return invoice;
  }

  changeStatus(code: string, input: { status: PurchaseInvoiceStatus }): PurchaseInvoice {
    const invoice = this.records.find((record) => record.code === code);
    if (!invoice) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Purchase invoice ${code} not found` });
    }
    invoice.status = input.status;
    invoice.updatedAt = new Date().toISOString();
    return invoice;
  }

  recordPayment(code: string, input: RecordPaymentInput): PurchaseInvoice {
    const invoice = this.records.find((record) => record.code === code);
    if (!invoice) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Purchase invoice ${code} not found` });
    }
    const remaining = round2(invoice.summary.total - invoice.amountPaid);
    if (input.amount > remaining) {
      throw new ApiException({
        code: ErrorCode.UNPROCESSABLE,
        status: 422,
        message: `Payment of ${input.amount} exceeds the remaining balance of ${remaining}`,
      });
    }
    invoice.amountPaid = round2(invoice.amountPaid + input.amount);
    if (invoice.status !== "cancelled") {
      invoice.status = invoice.amountPaid >= invoice.summary.total ? "paid" : "partially_paid";
    }
    invoice.updatedAt = new Date().toISOString();
    return invoice;
  }

  remove(code: string): void {
    const index = this.records.findIndex((record) => record.code === code);
    if (index === -1) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Purchase invoice ${code} not found` });
    }
    this.records.splice(index, 1);
  }
}
