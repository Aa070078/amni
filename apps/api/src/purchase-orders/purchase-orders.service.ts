import { Injectable } from "@nestjs/common";
import {
  ErrorCode,
  type CreateDocLine,
  type CreatePurchaseOrderInput,
  type DocLine,
  type DocSummary,
  type PurchaseOrder,
  type PurchaseOrderListQuery,
  type PurchaseOrderListResponse,
  type PurchaseOrderStatus,
  type UpdatePurchaseOrderInput,
} from "@amni/shared";

import { ApiException } from "../common/api.exception";

const DAY_MS = 86_400_000;
const iso = (daysAgo: number): string => new Date(Date.now() - daysAgo * DAY_MS).toISOString();
const round2 = (value: number): number => Math.round(value * 100) / 100;

const SORT_WHITELIST = new Set([
  "code",
  "supplier",
  "date",
  "expectedDate",
  "total",
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

export interface PurchaseOrderOptions {
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

const SEED: PurchaseOrder[] = [
  {
    code: "PO-0001",
    supplier: supplier("SUP-0001"),
    status: "completed",
    date: iso(60),
    expectedDate: iso(30),
    currency: "USD",
    summary: summarize([
      line(1, "PRD-0001", "Alderwood standing desk", "pcs", 10, 520),
      line(2, "PRD-0002", "Aria ergonomic chair", "pcs", 24, 245),
    ]),
    items: [
      line(1, "PRD-0001", "Alderwood standing desk", "pcs", 10, 520),
      line(2, "PRD-0002", "Aria ergonomic chair", "pcs", 24, 245),
    ],
    owner: "Amara Osei",
    notes: "Q1 furniture restock.",
    createdAt: iso(62),
    updatedAt: iso(30),
  },
  {
    code: "PO-0002",
    supplier: supplier("SUP-0004"),
    status: "submitted",
    date: iso(52),
    expectedDate: iso(10),
    currency: "USD",
    summary: summarize([
      line(1, "PRD-0003", "Lumen task lamp", "pcs", 60, 34),
      line(2, "PRD-0008", "Flux dual monitor arm", "pcs", 20, 58),
    ]),
    items: [
      line(1, "PRD-0003", "Lumen task lamp", "pcs", 60, 34),
      line(2, "PRD-0008", "Flux dual monitor arm", "pcs", 20, 58),
    ],
    owner: "Amara Osei",
    notes: "Lighting package for the new office floor.",
    createdAt: iso(52),
    updatedAt: iso(50),
  },
  {
    code: "PO-0003",
    supplier: supplier("SUP-0002"),
    status: "partially_received",
    date: iso(42),
    expectedDate: iso(5),
    currency: "USD",
    summary: summarize([
      line(1, "PRD-0004", "Linea lateral file cabinet", "pcs", 12, 138),
      line(2, "PRD-0007", "Acoustic partition panel", "pcs", 8, 172),
    ]),
    items: [
      line(1, "PRD-0004", "Linea lateral file cabinet", "pcs", 12, 138),
      line(2, "PRD-0007", "Acoustic partition panel", "pcs", 8, 172),
    ],
    owner: "Theo Lindqvist",
    notes: "Split delivery agreed; first batch arrived.",
    createdAt: iso(42),
    updatedAt: iso(40),
  },
  {
    code: "PO-0004",
    supplier: supplier("SUP-0005"),
    status: "draft",
    date: iso(32),
    expectedDate: iso(20),
    currency: "USD",
    summary: summarize([
      line(1, "PRD-0005", "Boardroom conference table", "pcs", 2, 890),
      line(2, "PRD-0006", "Serene modular sofa set", "set", 3, 760),
    ]),
    items: [
      line(1, "PRD-0005", "Boardroom conference table", "pcs", 2, 890),
      line(2, "PRD-0006", "Serene modular sofa set", "set", 3, 760),
    ],
    owner: "Amara Osei",
    notes: "Draft for boardroom refresh; awaiting approval.",
    createdAt: iso(32),
    updatedAt: iso(31),
  },
  {
    code: "PO-0005",
    supplier: supplier("SUP-0003"),
    status: "completed",
    date: iso(22),
    expectedDate: iso(12),
    currency: "USD",
    summary: summarize([
      line(1, "PRD-0003", "Lumen task lamp", "pcs", 40, 34),
    ]),
    items: [
      line(1, "PRD-0003", "Lumen task lamp", "pcs", 40, 34),
    ],
    owner: "Theo Lindqvist",
    notes: "Bulk desk lamp order.",
    createdAt: iso(22),
    updatedAt: iso(12),
  },
  {
    code: "PO-0006",
    supplier: supplier("SUP-0006"),
    status: "received",
    date: iso(12),
    expectedDate: iso(2),
    currency: "USD",
    summary: summarize([
      line(1, "PRD-0007", "Acoustic partition panel", "pcs", 16, 172),
    ]),
    items: [
      line(1, "PRD-0007", "Acoustic partition panel", "pcs", 16, 172),
    ],
    owner: "Amara Osei",
    notes: "Acoustic panels fully received.",
    createdAt: iso(12),
    updatedAt: iso(10),
  },
  {
    code: "PO-0007",
    supplier: supplier("SUP-0007"),
    status: "cancelled",
    date: iso(2),
    expectedDate: iso(1),
    currency: "USD",
    summary: summarize([
      line(1, "PRD-0002", "Aria ergonomic chair", "pcs", 10, 245),
    ]),
    items: [
      line(1, "PRD-0002", "Aria ergonomic chair", "pcs", 10, 245),
    ],
    owner: "Theo Lindqvist",
    notes: "Cancelled after supplier lead-time slipped.",
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

function nextCode(records: PurchaseOrder[]): string {
  const max = records.reduce((highest, order) => {
    const number = Number(order.code.slice(3));
    return number > highest ? number : highest;
  }, 0);
  return `PO-${String(max + 1).padStart(4, "0")}`;
}

function sortValue(order: PurchaseOrder, sortBy: string): unknown {
  if (sortBy === "supplier") return order.supplier.name;
  if (sortBy === "total") return order.summary.total;
  return order[sortBy as keyof PurchaseOrder];
}

/**
 * Reference data for the Demo Co tenant. This module is the only purchase-order
 * surface until the ERP gateway lands (M5); endpoints then read from the
 * tenant ERPNext site and keep the same contract.
 */
@Injectable()
export class PurchaseOrdersService {
  private records: PurchaseOrder[] = structuredClone(SEED);

  options(): PurchaseOrderOptions {
    return { suppliers: SEED_SUPPLIERS, products: SEED_PRODUCTS };
  }

  list(query: PurchaseOrderListQuery): PurchaseOrderListResponse {
    const q = (query.q ?? "").toLowerCase().trim();
    const filtered = this.records.filter((order) => {
      if (query.status && order.status !== query.status) return false;
      if (!q) return true;
      return [order.code, order.supplier.code, order.supplier.name, order.owner ?? "", order.notes ?? ""]
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

  detail(code: string): PurchaseOrder {
    const order = this.records.find((record) => record.code === code);
    if (!order) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Purchase order ${code} not found` });
    }
    return order;
  }

  create(input: CreatePurchaseOrderInput): PurchaseOrder {
    const lines = buildLines(input.items, (code) => SEED_PRODUCTS.find((product) => product.code === code)?.name);
    const date = input.date ?? new Date().toISOString();
    const order: PurchaseOrder = {
      code: nextCode(this.records),
      supplier: supplier(input.supplierCode),
      status: "draft",
      date,
      expectedDate: input.expectedDate ?? new Date(new Date(date).getTime() + 14 * DAY_MS).toISOString(),
      currency: input.currency ?? "USD",
      summary: summarize(lines),
      items: lines,
      owner: "Amara Osei",
      notes: input.notes ?? "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.records.push(order);
    return order;
  }

  update(code: string, input: UpdatePurchaseOrderInput): PurchaseOrder {
    const order = this.records.find((record) => record.code === code);
    if (!order) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Purchase order ${code} not found` });
    }
    if (input.supplierCode !== undefined) order.supplier = supplier(input.supplierCode);
    if (input.date !== undefined) order.date = input.date;
    if (input.expectedDate !== undefined) order.expectedDate = input.expectedDate;
    if (input.currency !== undefined) order.currency = input.currency;
    if (input.notes !== undefined) order.notes = input.notes;
    if (input.items !== undefined) {
      order.items = buildLines(input.items, (code) => SEED_PRODUCTS.find((product) => product.code === code)?.name);
      order.summary = summarize(order.items);
    }
    order.updatedAt = new Date().toISOString();
    return order;
  }

  changeStatus(code: string, input: { status: PurchaseOrderStatus }): PurchaseOrder {
    const order = this.records.find((record) => record.code === code);
    if (!order) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Purchase order ${code} not found` });
    }
    order.status = input.status;
    order.updatedAt = new Date().toISOString();
    return order;
  }

  remove(code: string): void {
    const index = this.records.findIndex((record) => record.code === code);
    if (index === -1) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Purchase order ${code} not found` });
    }
    this.records.splice(index, 1);
  }
}
