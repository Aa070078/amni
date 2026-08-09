import { Injectable } from "@nestjs/common";
import {
  ErrorCode,
  type CreateDocLine,
  type CreateSalesOrderInput,
  type CustomerSummary,
  type DocLine,
  type DocSummary,
  type SalesOrder,
  type SalesOrderListQuery,
  type SalesOrderListResponse,
  type SalesOrderStatus,
  type UpdateSalesOrderInput,
} from "@amni/shared";

import { ApiException } from "../common/api.exception";

const DAY_MS = 86_400_000;
const iso = (daysAgo: number): string => new Date(Date.now() - daysAgo * DAY_MS).toISOString();
const round2 = (value: number): number => Math.round(value * 100) / 100;

const SORT_WHITELIST = new Set([
  "code",
  "customer",
  "date",
  "deliveryDate",
  "total",
  "status",
  "owner",
  "createdAt",
  "updatedAt",
]);

export interface ProductOption {
  code: string;
  name: string;
  uom: string;
  rate: number;
}

export interface SalesOrderOptions {
  customers: CustomerSummary[];
  products: ProductOption[];
}

const SEED_CUSTOMERS: CustomerSummary[] = [
  { code: "CUS-0001", name: "Serenity Interiors" },
  { code: "CUS-0002", name: "Lumina Supplies" },
  { code: "CUS-0003", name: "Atlas Facilities" },
  { code: "CUS-0004", name: "Northwind Traders" },
  { code: "CUS-0005", name: "Bluepeak Logistics" },
  { code: "CUS-0006", name: "Harbor & Sage" },
  { code: "CUS-0007", name: "Copperwood Co." },
  { code: "CUS-0008", name: "Aster Retail Group" },
  { code: "CUS-0009", name: "Vantage Healthcare" },
  { code: "CUS-0010", name: "Summit View Hotels" },
];

const SEED_PRODUCTS: ProductOption[] = [
  { code: "PRD-0001", name: "Alderwood standing desk", uom: "pcs", rate: 1450 },
  { code: "PRD-0002", name: "Aria ergonomic chair", uom: "pcs", rate: 620 },
  { code: "PRD-0003", name: "Lumen task lamp", uom: "pcs", rate: 85 },
  { code: "PRD-0004", name: "Linea lateral file cabinet", uom: "pcs", rate: 340 },
  { code: "PRD-0005", name: "Boardroom conference table", uom: "pcs", rate: 2200 },
  { code: "PRD-0006", name: "Serene modular sofa set", uom: "set", rate: 1890 },
  { code: "PRD-0007", name: "Acoustic partition panel", uom: "pcs", rate: 410 },
  { code: "PRD-0008", name: "Flux dual monitor arm", uom: "pcs", rate: 150 },
];

const customer = (code: string): CustomerSummary => {
  const found = SEED_CUSTOMERS.find((entry) => entry.code === code);
  if (!found) {
    throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Customer ${code} not found` });
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

const SEED: SalesOrder[] = [
  {
    code: "SO-2040",
    customer: customer("CUS-0006"),
    status: "delivered",
    date: iso(44),
    deliveryDate: iso(10),
    currency: "USD",
    summary: summarize([line(1, "PRD-0001", "Alderwood standing desk", "pcs", 2, 1450), line(2, "PRD-0002", "Aria ergonomic chair", "pcs", 4, 620)]),
    items: [line(1, "PRD-0001", "Alderwood standing desk", "pcs", 2, 1450), line(2, "PRD-0002", "Aria ergonomic chair", "pcs", 4, 620)],
    owner: "Amara Osei",
    notes: "First order from the signed fit-out proposal.",
    createdAt: iso(45),
    updatedAt: iso(6),
  },
  {
    code: "SO-2041",
    customer: customer("CUS-0003"),
    status: "submitted",
    date: iso(3),
    deliveryDate: iso(-14),
    currency: "USD",
    summary: summarize([line(1, "PRD-0004", "Linea lateral file cabinet", "pcs", 5, 340), line(2, "PRD-0007", "Acoustic partition panel", "pcs", 4, 410)]),
    items: [line(1, "PRD-0004", "Linea lateral file cabinet", "pcs", 5, 340), line(2, "PRD-0007", "Acoustic partition panel", "pcs", 4, 410)],
    owner: "Amara Osei",
    quotationCode: "QT-0011",
    notes: "Atlas facilities fit-out, submitted with delivery split across two batches.",
    createdAt: iso(3),
    updatedAt: iso(0),
  },
  {
    code: "SO-2042",
    customer: customer("CUS-0010"),
    status: "submitted",
    date: iso(5),
    deliveryDate: iso(-16),
    currency: "USD",
    summary: summarize([line(1, "PRD-0006", "Serene modular sofa set", "set", 3, 1890), line(2, "PRD-0001", "Alderwood standing desk", "pcs", 2, 1450)], 500),
    items: [line(1, "PRD-0006", "Serene modular sofa set", "set", 3, 1890), line(2, "PRD-0001", "Alderwood standing desk", "pcs", 2, 1450)],
    owner: "Amara Osei",
    notes: "Lobby and suite furniture package for the renovated hotel.",
    createdAt: iso(5),
    updatedAt: iso(0),
  },
  {
    code: "SO-2043",
    customer: customer("CUS-0001"),
    status: "draft",
    date: iso(1),
    deliveryDate: iso(-21),
    currency: "USD",
    summary: summarize([line(1, "PRD-0005", "Boardroom conference table", "pcs", 2, 2200), line(2, "PRD-0002", "Aria ergonomic chair", "pcs", 6, 620)], 0, 812),
    items: [line(1, "PRD-0005", "Boardroom conference table", "pcs", 2, 2200), line(2, "PRD-0002", "Aria ergonomic chair", "pcs", 6, 620)],
    owner: "Amara Osei",
    quotationCode: "QT-0001",
    notes: "Draft office fit-out, pending final pricing approval.",
    createdAt: iso(1),
    updatedAt: iso(0),
  },
  {
    code: "SO-2044",
    customer: customer("CUS-0004"),
    status: "completed",
    date: iso(60),
    deliveryDate: iso(30),
    currency: "USD",
    summary: summarize([line(1, "PRD-0004", "Linea lateral file cabinet", "pcs", 6, 340), line(2, "PRD-0003", "Lumen task lamp", "pcs", 10, 85)]),
    items: [line(1, "PRD-0004", "Linea lateral file cabinet", "pcs", 6, 340), line(2, "PRD-0003", "Lumen task lamp", "pcs", 10, 85)],
    owner: "Theo Lindqvist",
    notes: "Warehouse shelving refresh. Fulfilled and closed.",
    createdAt: iso(61),
    updatedAt: iso(30),
  },
  {
    code: "SO-2045",
    customer: customer("CUS-0005"),
    status: "delivered",
    date: iso(52),
    deliveryDate: iso(6),
    currency: "USD",
    summary: summarize([line(1, "PRD-0006", "Serene modular sofa set", "set", 4, 1890), line(2, "PRD-0008", "Flux dual monitor arm", "pcs", 2, 150)], 300),
    items: [line(1, "PRD-0006", "Serene modular sofa set", "set", 4, 1890), line(2, "PRD-0008", "Flux dual monitor arm", "pcs", 2, 150)],
    owner: "Theo Lindqvist",
    notes: "Delivered and invoiced in full.",
    createdAt: iso(53),
    updatedAt: iso(6),
  },
  {
    code: "SO-2046",
    customer: customer("CUS-0002"),
    status: "submitted",
    date: iso(8),
    deliveryDate: iso(-12),
    currency: "USD",
    summary: summarize([line(1, "PRD-0003", "Lumen task lamp", "pcs", 12, 85), line(2, "PRD-0008", "Flux dual monitor arm", "pcs", 3, 150)], 0, 147),
    items: [line(1, "PRD-0003", "Lumen task lamp", "pcs", 12, 85), line(2, "PRD-0008", "Flux dual monitor arm", "pcs", 3, 150)],
    owner: "Theo Lindqvist",
    quotationCode: "QT-0003",
    notes: "Retail lighting refresh from the accepted quotation.",
    createdAt: iso(8),
    updatedAt: iso(0),
  },
  {
    code: "SO-2047",
    customer: customer("CUS-0007"),
    status: "partially_delivered",
    date: iso(18),
    deliveryDate: iso(-5),
    currency: "USD",
    summary: summarize([line(1, "PRD-0006", "Serene modular sofa set", "set", 1, 1890), line(2, "PRD-0002", "Aria ergonomic chair", "pcs", 2, 620)]),
    items: [line(1, "PRD-0006", "Serene modular sofa set", "set", 1, 1890), line(2, "PRD-0002", "Aria ergonomic chair", "pcs", 2, 620)],
    owner: "Amara Osei",
    notes: "Sofa set delivered; chairs on back-order.",
    createdAt: iso(18),
    updatedAt: iso(3),
  },
  {
    code: "SO-2048",
    customer: customer("CUS-0008"),
    status: "cancelled",
    date: iso(30),
    deliveryDate: iso(-10),
    currency: "USD",
    summary: summarize([line(1, "PRD-0001", "Alderwood standing desk", "pcs", 3, 1450), line(2, "PRD-0007", "Acoustic partition panel", "pcs", 6, 410)]),
    items: [line(1, "PRD-0001", "Alderwood standing desk", "pcs", 3, 1450), line(2, "PRD-0007", "Acoustic partition panel", "pcs", 6, 410)],
    owner: "Theo Lindqvist",
    notes: "Cancelled by customer before shipment.",
    createdAt: iso(31),
    updatedAt: iso(12),
  },
  {
    code: "SO-2049",
    customer: customer("CUS-0009"),
    status: "partially_delivered",
    date: iso(12),
    deliveryDate: iso(-6),
    currency: "USD",
    summary: summarize([line(1, "PRD-0002", "Aria ergonomic chair", "pcs", 6, 620), line(2, "PRD-0008", "Flux dual monitor arm", "pcs", 8, 150)], 200),
    items: [line(1, "PRD-0002", "Aria ergonomic chair", "pcs", 6, 620), line(2, "PRD-0008", "Flux dual monitor arm", "pcs", 8, 150)],
    owner: "Amara Osei",
    notes: "Chairs delivered; monitor arms pending.",
    createdAt: iso(13),
    updatedAt: iso(2),
  },
  {
    code: "SO-2050",
    customer: customer("CUS-0005"),
    status: "completed",
    date: iso(70),
    deliveryDate: iso(20),
    currency: "USD",
    summary: summarize([line(1, "PRD-0006", "Serene modular sofa set", "set", 6, 1890), line(2, "PRD-0005", "Boardroom conference table", "pcs", 2, 2200)]),
    items: [line(1, "PRD-0006", "Serene modular sofa set", "set", 6, 1890), line(2, "PRD-0005", "Boardroom conference table", "pcs", 2, 2200)],
    owner: "Amara Osei",
    notes: "Showroom fit-out completed and closed.",
    createdAt: iso(71),
    updatedAt: iso(20),
  },
  {
    code: "SO-2051",
    customer: customer("CUS-0001"),
    status: "draft",
    date: iso(2),
    deliveryDate: null,
    currency: "USD",
    summary: summarize([line(1, "PRD-0001", "Alderwood standing desk", "pcs", 4, 1450), line(2, "PRD-0002", "Aria ergonomic chair", "pcs", 8, 620)]),
    items: [line(1, "PRD-0001", "Alderwood standing desk", "pcs", 4, 1450), line(2, "PRD-0002", "Aria ergonomic chair", "pcs", 8, 620)],
    owner: "Amara Osei",
    notes: "Second fit-out draft awaiting sign-off.",
    createdAt: iso(2),
    updatedAt: iso(0),
  },
  {
    code: "SO-2052",
    customer: customer("CUS-0007"),
    status: "cancelled",
    date: iso(25),
    deliveryDate: iso(-15),
    currency: "USD",
    summary: summarize([line(1, "PRD-0007", "Acoustic partition panel", "pcs", 2, 410), line(2, "PRD-0003", "Lumen task lamp", "pcs", 6, 85)]),
    items: [line(1, "PRD-0007", "Acoustic partition panel", "pcs", 2, 410), line(2, "PRD-0003", "Lumen task lamp", "pcs", 6, 85)],
    owner: "Theo Lindqvist",
    notes: "Customer backed out after budget review.",
    createdAt: iso(26),
    updatedAt: iso(8),
  },
  {
    code: "SO-2053",
    customer: customer("CUS-0010"),
    status: "delivered",
    date: iso(40),
    deliveryDate: iso(1),
    currency: "USD",
    summary: summarize([line(1, "PRD-0005", "Boardroom conference table", "pcs", 4, 2200), line(2, "PRD-0002", "Aria ergonomic chair", "pcs", 12, 620)]),
    items: [line(1, "PRD-0005", "Boardroom conference table", "pcs", 4, 2200), line(2, "PRD-0002", "Aria ergonomic chair", "pcs", 12, 620)],
    owner: "Amara Osei",
    notes: "Conference rooms kitted out and delivered.",
    createdAt: iso(41),
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

function nextCode(records: SalesOrder[]): string {
  const max = records.reduce((highest, order) => {
    const number = Number(order.code.slice(3));
    return number > highest ? number : highest;
  }, 0);
  return `SO-${String(max + 1).padStart(4, "0")}`;
}

function sortValue(order: SalesOrder, sortBy: string): unknown {
  if (sortBy === "customer") return order.customer.name;
  if (sortBy === "total") return order.summary.total;
  return order[sortBy as keyof SalesOrder];
}

/**
 * Reference data for the Demo Co tenant. This module is the only sales-order
 * surface until the ERP gateway lands (M5); endpoints then read from the
 * tenant ERPNext site and keep the same contract.
 */
@Injectable()
export class SalesOrdersService {
  private records: SalesOrder[] = structuredClone(SEED);

  options(): SalesOrderOptions {
    return { customers: SEED_CUSTOMERS, products: SEED_PRODUCTS };
  }

  list(query: SalesOrderListQuery): SalesOrderListResponse {
    const q = (query.q ?? "").toLowerCase().trim();
    const filtered = this.records.filter((order) => {
      if (query.status && order.status !== query.status) return false;
      if (!q) return true;
      return [
        order.code,
        order.customer.code,
        order.customer.name,
        order.owner ?? "",
        order.quotationCode ?? "",
        order.notes ?? "",
      ]
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

  detail(code: string): SalesOrder {
    const order = this.records.find((record) => record.code === code);
    if (!order) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Sales order ${code} not found` });
    }
    return order;
  }

  create(input: CreateSalesOrderInput): SalesOrder {
    const lines = buildLines(input.items, (code) => SEED_PRODUCTS.find((product) => product.code === code)?.name);
    const order: SalesOrder = {
      code: nextCode(this.records),
      customer: customer(input.customerCode),
      status: "draft",
      date: input.date ?? new Date().toISOString(),
      deliveryDate: input.deliveryDate ?? null,
      currency: input.currency ?? "USD",
      summary: summarize(lines),
      items: lines,
      owner: "Amara Osei",
      quotationCode: input.quotationCode,
      notes: input.notes ?? "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.records.push(order);
    return order;
  }

  update(code: string, input: UpdateSalesOrderInput): SalesOrder {
    const order = this.records.find((record) => record.code === code);
    if (!order) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Sales order ${code} not found` });
    }
    if (input.customerCode !== undefined) order.customer = customer(input.customerCode);
    if (input.date !== undefined) order.date = input.date;
    if (input.deliveryDate !== undefined) order.deliveryDate = input.deliveryDate;
    if (input.currency !== undefined) order.currency = input.currency;
    if (input.quotationCode !== undefined) order.quotationCode = input.quotationCode;
    if (input.notes !== undefined) order.notes = input.notes;
    if (input.items !== undefined) {
      order.items = buildLines(input.items, (code) => SEED_PRODUCTS.find((product) => product.code === code)?.name);
      order.summary = summarize(order.items);
    }
    order.updatedAt = new Date().toISOString();
    return order;
  }

  changeStatus(code: string, input: { status: SalesOrderStatus }): SalesOrder {
    const order = this.records.find((record) => record.code === code);
    if (!order) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Sales order ${code} not found` });
    }
    order.status = input.status;
    order.updatedAt = new Date().toISOString();
    return order;
  }

  remove(code: string): void {
    const index = this.records.findIndex((record) => record.code === code);
    if (index === -1) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Sales order ${code} not found` });
    }
    this.records.splice(index, 1);
  }
}
