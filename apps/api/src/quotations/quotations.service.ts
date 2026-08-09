import { Injectable } from "@nestjs/common";
import {
  ErrorCode,
  type CreateQuotationInput,
  type CustomerSummary,
  type DocLine,
  type DocSummary,
  type Quotation,
  type QuotationListQuery,
  type QuotationListResponse,
  type QuotationStatus,
  type UpdateQuotationInput,
} from "@amni/shared";

import { ApiException } from "../common/api.exception";

const DAY_MS = 86_400_000;
const iso = (daysAgo: number): string => new Date(Date.now() - daysAgo * DAY_MS).toISOString();

const SORT_WHITELIST = new Set([
  "code",
  "date",
  "validUntil",
  "status",
  "owner",
  "createdAt",
  "updatedAt",
  "total",
]);

const CUSTOMERS: CustomerSummary[] = [
  { code: "CUS-0001", name: "Serenity Interiors" },
  { code: "CUS-0002", name: "Lumina Supplies" },
  { code: "CUS-0003", name: "Atlas Facilities" },
  { code: "CUS-0004", name: "Northwind Traders" },
  { code: "CUS-0005", name: "Bluepeak Logistics" },
  { code: "CUS-0006", name: "Harbor & Sage" },
];

interface SeedProduct {
  code: string;
  name: string;
  uom: string;
  rate: number;
}

const PRODUCTS: SeedProduct[] = [
  { code: "PRD-0001", name: "Ergo Task Chair", uom: "pcs", rate: 340 },
  { code: "PRD-0002", name: "Standing Desk Pro", uom: "pcs", rate: 720 },
  { code: "PRD-0003", name: "LED Panel Light 60cm", uom: "pcs", rate: 45 },
  { code: "PRD-0004", name: "Steel Storage Rack", uom: "pcs", rate: 260 },
  { code: "PRD-0005", name: "Acoustic Wall Panel", uom: "sqm", rate: 58 },
  { code: "PRD-0006", name: "Conference Table 2400", uom: "pcs", rate: 1180 },
];

export interface QuotationOptions {
  customers: { code: string; name: string }[];
  products: { code: string; name: string; uom: string; rate: number }[];
}

interface SeedQuotationLine {
  product: string;
  qty: number;
  rate: number;
}

interface SeedQuotation {
  code: string;
  customerCode: string;
  status: QuotationStatus;
  date: string;
  validUntil: string | null;
  currency?: string;
  owner?: string;
  notes?: string;
  discount?: number;
  lines: SeedQuotationLine[];
  createdAt: string;
  updatedAt: string;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

function computeSummary(items: DocLine[], discount = 0): DocSummary {
  const subtotal = round2(items.reduce((sum, item) => sum + item.amount, 0));
  const tax = round2((subtotal - discount) * 0.1);
  return { subtotal, discount: round2(discount), tax, total: round2(subtotal - discount + tax) };
}

function buildItems(lines: SeedQuotationLine[] | CreateQuotationInput["items"]): DocLine[] {
  return lines.map((line, index) => {
    const product = PRODUCTS.find((entry) => entry.code === line.product);
    const name = "name" in line && line.name ? line.name : (product?.name ?? line.product);
    const uom = "uom" in line && line.uom ? line.uom : (product?.uom ?? "pcs");
    return {
      lineNo: index + 1,
      product: line.product,
      name,
      uom,
      qty: line.qty,
      rate: line.rate,
      amount: round2(line.qty * line.rate),
    };
  });
}

const SEED: SeedQuotation[] = [
  { code: "QT-0001", customerCode: "CUS-0001", status: "sent", date: iso(3), validUntil: iso(-27), owner: "Amara Osei", discount: 500, notes: "Office fit-out for the Mission district studio. Volume discount applied.", lines: [{ product: "PRD-0002", qty: 12, rate: 720 }, { product: "PRD-0001", qty: 24, rate: 340 }], createdAt: iso(4), updatedAt: iso(1) },
  { code: "QT-0002", customerCode: "CUS-0003", status: "draft", date: iso(1), validUntil: iso(-29), owner: "Amara Osei", notes: "", lines: [{ product: "PRD-0005", qty: 80, rate: 58 }], createdAt: iso(2), updatedAt: iso(0) },
  { code: "QT-0003", customerCode: "CUS-0002", status: "accepted", date: iso(12), validUntil: iso(-10), owner: "Theo Lindqvist", discount: 250, notes: "Retail lighting refresh for three locations.", lines: [{ product: "PRD-0003", qty: 150, rate: 45 }, { product: "PRD-0001", qty: 10, rate: 340 }], createdAt: iso(13), updatedAt: iso(8) },
  { code: "QT-0004", customerCode: "CUS-0004", status: "expired", date: iso(45), validUntil: iso(3), owner: "Theo Lindqvist", notes: "Lapsed before the customer responded.", lines: [{ product: "PRD-0004", qty: 40, rate: 260 }], createdAt: iso(46), updatedAt: iso(3) },
  { code: "QT-0005", customerCode: "CUS-0005", status: "converted", date: iso(30), validUntil: iso(2), owner: "Amara Osei", discount: 400, notes: "Converted to SO-2031 after warehouse sign-off.", lines: [{ product: "PRD-0006", qty: 6, rate: 1180 }, { product: "PRD-0002", qty: 8, rate: 720 }], createdAt: iso(31), updatedAt: iso(20) },
  { code: "QT-0006", customerCode: "CUS-0006", status: "rejected", date: iso(8), validUntil: iso(-22), owner: "Amara Osei", discount: 100, notes: "Went with a lower bid.", lines: [{ product: "PRD-0001", qty: 18, rate: 340 }], createdAt: iso(9), updatedAt: iso(7) },
  { code: "QT-0007", customerCode: "CUS-0001", status: "sent", date: iso(2), validUntil: iso(-28), owner: "Theo Lindqvist", discount: 300, notes: "Revised quote with acoustic panels optioned in.", lines: [{ product: "PRD-0005", qty: 120, rate: 58 }, { product: "PRD-0003", qty: 60, rate: 45 }], createdAt: iso(3), updatedAt: iso(0) },
  { code: "QT-0008", customerCode: "CUS-0002", status: "draft", date: iso(0), validUntil: iso(-30), owner: "Amara Osei", notes: "", lines: [{ product: "PRD-0006", qty: 3, rate: 1180 }], createdAt: iso(1), updatedAt: iso(0) },
  { code: "QT-0009", customerCode: "CUS-0004", status: "converted", date: iso(20), validUntil: iso(-5), owner: "Theo Lindqvist", discount: 200, notes: "Converted to SO-2027.", lines: [{ product: "PRD-0004", qty: 25, rate: 260 }, { product: "PRD-0002", qty: 6, rate: 720 }], createdAt: iso(21), updatedAt: iso(14) },
  { code: "QT-0010", customerCode: "CUS-0005", status: "sent", date: iso(4), validUntil: iso(-26), owner: "Amara Osei", discount: 150, notes: "Warehouse seating refresh.", lines: [{ product: "PRD-0001", qty: 30, rate: 340 }], createdAt: iso(5), updatedAt: iso(2) },
  { code: "QT-0011", customerCode: "CUS-0003", status: "accepted", date: iso(6), validUntil: iso(-18), owner: "Theo Lindqvist", discount: 320, notes: "Accepted with fixtures delivery split across two batches.", lines: [{ product: "PRD-0003", qty: 200, rate: 45 }, { product: "PRD-0005", qty: 40, rate: 58 }], createdAt: iso(7), updatedAt: iso(4) },
  { code: "QT-0012", customerCode: "CUS-0006", status: "expired", date: iso(60), validUntil: iso(10), owner: "Amara Osei", notes: "No response; quote lapsed.", lines: [{ product: "PRD-0006", qty: 4, rate: 1180 }, { product: "PRD-0004", qty: 12, rate: 260 }], createdAt: iso(61), updatedAt: iso(10) },
];

const toQuotation = (seed: SeedQuotation): Quotation => {
  const customer = CUSTOMERS.find((entry) => entry.code === seed.customerCode);
  if (!customer) {
    throw new Error(`Seed quotation ${seed.code} references unknown customer ${seed.customerCode}`);
  }
  const items = buildItems(seed.lines);
  return {
    code: seed.code,
    customer: { code: customer.code, name: customer.name },
    status: seed.status,
    date: seed.date,
    validUntil: seed.validUntil ?? null,
    currency: seed.currency ?? "USD",
    summary: computeSummary(items, seed.discount ?? 0),
    items,
    owner: seed.owner ?? "Amara Osei",
    notes: seed.notes ?? "",
    createdAt: seed.createdAt,
    updatedAt: seed.updatedAt,
  };
};

function nextCode(records: Quotation[]): string {
  const max = records.reduce((highest, quotation) => {
    const number = Number(quotation.code.slice(3));
    return number > highest ? number : highest;
  }, 0);
  return `QT-${String(max + 1).padStart(4, "0")}`;
}

/**
 * Reference data for the Demo Co tenant. This module is the only quotations
 * surface until the ERP gateway lands (M5); endpoints then read from the
 * tenant ERPNext site and keep the same contract.
 */
@Injectable()
export class QuotationsService {
  private records: Quotation[] = SEED.map(toQuotation);

  options(): QuotationOptions {
    return {
      customers: CUSTOMERS.map(({ code, name }) => ({ code, name })),
      products: PRODUCTS.map(({ code, name, uom, rate }) => ({ code, name, uom, rate })),
    };
  }

  list(query: QuotationListQuery): QuotationListResponse {
    const q = (query.q ?? "").toLowerCase().trim();
    const filtered = this.records.filter((quotation) => {
      if (query.status && quotation.status !== query.status) return false;
      if (!q) return true;
      return [
        quotation.code,
        quotation.customer.code,
        quotation.customer.name,
        quotation.owner ?? "",
        quotation.notes ?? "",
        ...quotation.items.map((item) => item.name),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });

    const whitelisted = query.sortBy !== undefined && SORT_WHITELIST.has(query.sortBy);
    const sortBy = whitelisted ? query.sortBy : "createdAt";
    const sortDir = whitelisted && query.sortDir === "asc" ? 1 : -1;
    const sorted = [...filtered].sort((a, b) => {
      const aValue = sortBy === "total" ? a.summary.total : a[sortBy as keyof Quotation];
      const bValue = sortBy === "total" ? b.summary.total : b[sortBy as keyof Quotation];
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

  detail(code: string): Quotation {
    const quotation = this.records.find((record) => record.code === code);
    if (!quotation) {
      throw new ApiException({
        code: ErrorCode.NOT_FOUND,
        status: 404,
        message: `Quotation ${code} not found`,
      });
    }
    return quotation;
  }

  create(input: CreateQuotationInput): Quotation {
    const customer = CUSTOMERS.find((entry) => entry.code === input.customerCode);
    if (!customer) {
      throw new ApiException({
        code: ErrorCode.NOT_FOUND,
        status: 404,
        message: `Customer ${input.customerCode} not found`,
      });
    }
    const items = buildItems(input.items);
    const now = new Date().toISOString();
    const quotation: Quotation = {
      code: nextCode(this.records),
      customer: { code: customer.code, name: customer.name },
      status: "draft",
      date: input.date ?? now,
      validUntil: input.validUntil ?? iso(-30),
      currency: input.currency ?? "USD",
      summary: computeSummary(items),
      items,
      owner: "Amara Osei",
      notes: input.notes ?? "",
      createdAt: now,
      updatedAt: now,
    };
    this.records.push(quotation);
    return quotation;
  }

  update(code: string, input: UpdateQuotationInput): Quotation {
    const quotation = this.records.find((record) => record.code === code);
    if (!quotation) {
      throw new ApiException({
        code: ErrorCode.NOT_FOUND,
        status: 404,
        message: `Quotation ${code} not found`,
      });
    }
    if (input.customerCode !== undefined) {
      const customer = CUSTOMERS.find((entry) => entry.code === input.customerCode);
      if (!customer) {
        throw new ApiException({
          code: ErrorCode.NOT_FOUND,
          status: 404,
          message: `Customer ${input.customerCode} not found`,
        });
      }
      quotation.customer = { code: customer.code, name: customer.name };
    }
    if (input.date !== undefined) quotation.date = input.date;
    if (input.validUntil !== undefined) quotation.validUntil = input.validUntil;
    if (input.currency !== undefined) quotation.currency = input.currency;
    if (input.notes !== undefined) quotation.notes = input.notes;
    if (input.items !== undefined) {
      quotation.items = buildItems(input.items);
      quotation.summary = computeSummary(quotation.items);
    }
    quotation.updatedAt = new Date().toISOString();
    return quotation;
  }

  changeStatus(code: string, status: QuotationStatus): Quotation {
    const quotation = this.records.find((record) => record.code === code);
    if (!quotation) {
      throw new ApiException({
        code: ErrorCode.NOT_FOUND,
        status: 404,
        message: `Quotation ${code} not found`,
      });
    }
    quotation.status = status;
    quotation.updatedAt = new Date().toISOString();
    return quotation;
  }

  remove(code: string): void {
    const index = this.records.findIndex((record) => record.code === code);
    if (index === -1) {
      throw new ApiException({
        code: ErrorCode.NOT_FOUND,
        status: 404,
        message: `Quotation ${code} not found`,
      });
    }
    this.records.splice(index, 1);
  }
}
