import { Injectable } from "@nestjs/common";
import {
  ErrorCode,
  type CreateDocLine,
  type CreateSalesInvoiceInput,
  type CustomerSummary,
  type DocLine,
  type DocSummary,
  type RecordPaymentInput,
  type SalesInvoice,
  type SalesInvoiceListQuery,
  type SalesInvoiceListResponse,
  type SalesInvoiceStatus,
  type UpdateSalesInvoiceInput,
} from "@amni/shared";

import { ApiException } from "../common/api.exception";

const DAY_MS = 86_400_000;
const iso = (daysOffset: number): string => new Date(Date.now() + daysOffset * DAY_MS).toISOString();
const round2 = (value: number): number => Math.round(value * 100) / 100;

const SORT_WHITELIST = new Set([
  "code",
  "customer",
  "date",
  "dueDate",
  "total",
  "amountPaid",
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

export interface SalesInvoiceOptions {
  customers: CustomerSummary[];
  products: ProductOption[];
}

export interface SalesInvoiceSummary {
  outstanding: number;
  monthBilled: number;
  overdue: number;
  count: number;
  currency: string;
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

const SEED: SalesInvoice[] = [
  {
    code: "INV-0001",
    customer: customer("CUS-0006"),
    status: "paid",
    date: iso(-48),
    dueDate: iso(-18),
    currency: "USD",
    summary: summarize([
      line(1, "PRD-0001", "Alderwood standing desk", "pcs", 2, 1450),
      line(2, "PRD-0002", "Aria ergonomic chair", "pcs", 4, 620),
    ]),
    items: [
      line(1, "PRD-0001", "Alderwood standing desk", "pcs", 2, 1450),
      line(2, "PRD-0002", "Aria ergonomic chair", "pcs", 4, 620),
    ],
    amountPaid: 5380,
    owner: "Amara Osei",
    salesOrderCode: "SO-2040",
    notes: "First order from the signed fit-out proposal.",
    createdAt: iso(-50),
    updatedAt: iso(-18),
  },
  {
    code: "INV-0002",
    customer: customer("CUS-0004"),
    status: "overdue",
    date: iso(-75),
    dueDate: iso(-15),
    currency: "USD",
    summary: summarize([
      line(1, "PRD-0004", "Linea lateral file cabinet", "pcs", 6, 340),
      line(2, "PRD-0003", "Lumen task lamp", "pcs", 10, 85),
    ]),
    items: [
      line(1, "PRD-0004", "Linea lateral file cabinet", "pcs", 6, 340),
      line(2, "PRD-0003", "Lumen task lamp", "pcs", 10, 85),
    ],
    amountPaid: 0,
    owner: "Theo Lindqvist",
    salesOrderCode: "SO-2015",
    notes: "Payment terms 30 days. Follow up on outstanding balance.",
    createdAt: iso(-77),
    updatedAt: iso(-10),
  },
  {
    code: "INV-0003",
    customer: customer("CUS-0001"),
    status: "partially_paid",
    date: iso(-30),
    dueDate: iso(-1),
    currency: "USD",
    summary: summarize([
      line(1, "PRD-0001", "Alderwood standing desk", "pcs", 4, 1450),
      line(2, "PRD-0002", "Aria ergonomic chair", "pcs", 8, 620),
      line(3, "PRD-0007", "Acoustic partition panel", "pcs", 2, 410),
    ]),
    items: [
      line(1, "PRD-0001", "Alderwood standing desk", "pcs", 4, 1450),
      line(2, "PRD-0002", "Aria ergonomic chair", "pcs", 8, 620),
      line(3, "PRD-0007", "Acoustic partition panel", "pcs", 2, 410),
    ],
    amountPaid: 5000,
    owner: "Amara Osei",
    salesOrderCode: "SO-2038",
    notes: "Deposit received; balance due on delivery.",
    createdAt: iso(-32),
    updatedAt: iso(-1),
  },
  {
    code: "INV-0004",
    customer: customer("CUS-0002"),
    status: "paid",
    date: iso(-60),
    dueDate: iso(-30),
    currency: "USD",
    summary: summarize([
      line(1, "PRD-0003", "Lumen task lamp", "pcs", 40, 85),
      line(2, "PRD-0008", "Flux dual monitor arm", "pcs", 12, 150),
    ]),
    items: [
      line(1, "PRD-0003", "Lumen task lamp", "pcs", 40, 85),
      line(2, "PRD-0008", "Flux dual monitor arm", "pcs", 12, 150),
    ],
    amountPaid: 5200,
    owner: "Amara Osei",
    notes: "",
    createdAt: iso(-62),
    updatedAt: iso(-30),
  },
  {
    code: "INV-0005",
    customer: customer("CUS-0003"),
    status: "submitted",
    date: iso(-8),
    dueDate: iso(22),
    currency: "USD",
    summary: summarize([
      line(1, "PRD-0004", "Linea lateral file cabinet", "pcs", 5, 340),
      line(2, "PRD-0007", "Acoustic partition panel", "pcs", 4, 410),
    ]),
    items: [
      line(1, "PRD-0004", "Linea lateral file cabinet", "pcs", 5, 340),
      line(2, "PRD-0007", "Acoustic partition panel", "pcs", 4, 410),
    ],
    amountPaid: 0,
    owner: "Amara Osei",
    salesOrderCode: "SO-2041",
    notes: "Submitted with 14-day payment terms.",
    createdAt: iso(-10),
    updatedAt: iso(-8),
  },
  {
    code: "INV-0006",
    customer: customer("CUS-0007"),
    status: "partially_paid",
    date: iso(-20),
    dueDate: iso(10),
    currency: "USD",
    summary: summarize([
      line(1, "PRD-0006", "Serene modular sofa set", "set", 1, 1890),
      line(2, "PRD-0002", "Aria ergonomic chair", "pcs", 2, 620),
    ]),
    items: [
      line(1, "PRD-0006", "Serene modular sofa set", "set", 1, 1890),
      line(2, "PRD-0002", "Aria ergonomic chair", "pcs", 2, 620),
    ],
    amountPaid: 2000,
    owner: "Amara Osei",
    notes: "Partial payment received against showroom install.",
    createdAt: iso(-22),
    updatedAt: iso(-5),
  },
  {
    code: "INV-0007",
    customer: customer("CUS-0008"),
    status: "paid",
    date: iso(-90),
    dueDate: iso(-60),
    currency: "USD",
    summary: summarize([
      line(1, "PRD-0001", "Alderwood standing desk", "pcs", 3, 1450),
      line(2, "PRD-0007", "Acoustic partition panel", "pcs", 6, 410),
    ]),
    items: [
      line(1, "PRD-0001", "Alderwood standing desk", "pcs", 3, 1450),
      line(2, "PRD-0007", "Acoustic partition panel", "pcs", 6, 410),
    ],
    amountPaid: 6810,
    owner: "Theo Lindqvist",
    salesOrderCode: "SO-2012",
    notes: "Paid in full within discount window.",
    createdAt: iso(-92),
    updatedAt: iso(-60),
  },
  {
    code: "INV-0008",
    customer: customer("CUS-0005"),
    status: "overdue",
    date: iso(-55),
    dueDate: iso(-5),
    currency: "USD",
    summary: summarize([
      line(1, "PRD-0004", "Linea lateral file cabinet", "pcs", 8, 340),
      line(2, "PRD-0003", "Lumen task lamp", "pcs", 15, 85),
    ]),
    items: [
      line(1, "PRD-0004", "Linea lateral file cabinet", "pcs", 8, 340),
      line(2, "PRD-0003", "Lumen task lamp", "pcs", 15, 85),
    ],
    amountPaid: 1000,
    owner: "Theo Lindqvist",
    salesOrderCode: "SO-2019",
    notes: "Part payment posted; remainder past due.",
    createdAt: iso(-57),
    updatedAt: iso(-5),
  },
  {
    code: "INV-0009",
    customer: customer("CUS-0009"),
    status: "draft",
    date: iso(-2),
    dueDate: iso(28),
    currency: "USD",
    summary: summarize([
      line(1, "PRD-0002", "Aria ergonomic chair", "pcs", 6, 620),
      line(2, "PRD-0008", "Flux dual monitor arm", "pcs", 8, 150),
    ]),
    items: [
      line(1, "PRD-0002", "Aria ergonomic chair", "pcs", 6, 620),
      line(2, "PRD-0008", "Flux dual monitor arm", "pcs", 8, 150),
    ],
    amountPaid: 0,
    owner: "Amara Osei",
    notes: "Awaiting final pricing approval before submission.",
    createdAt: iso(-3),
    updatedAt: iso(-2),
  },
  {
    code: "INV-0010",
    customer: customer("CUS-0010"),
    status: "submitted",
    date: iso(-5),
    dueDate: iso(25),
    currency: "USD",
    summary: summarize([
      line(1, "PRD-0006", "Serene modular sofa set", "set", 3, 1890),
      line(2, "PRD-0001", "Alderwood standing desk", "pcs", 2, 1450),
    ]),
    items: [
      line(1, "PRD-0006", "Serene modular sofa set", "set", 3, 1890),
      line(2, "PRD-0001", "Alderwood standing desk", "pcs", 2, 1450),
    ],
    amountPaid: 0,
    owner: "Amara Osei",
    salesOrderCode: "SO-2042",
    notes: "Lobby and suite furniture package.",
    createdAt: iso(-7),
    updatedAt: iso(-5),
  },
  {
    code: "INV-0011",
    customer: customer("CUS-0002"),
    status: "cancelled",
    date: iso(-35),
    dueDate: iso(5),
    currency: "USD",
    summary: summarize([
      line(1, "PRD-0003", "Lumen task lamp", "pcs", 10, 85),
      line(2, "PRD-0008", "Flux dual monitor arm", "pcs", 4, 150),
    ]),
    items: [
      line(1, "PRD-0003", "Lumen task lamp", "pcs", 10, 85),
      line(2, "PRD-0008", "Flux dual monitor arm", "pcs", 4, 150),
    ],
    amountPaid: 0,
    owner: "Theo Lindqvist",
    notes: "Order cancelled by customer before shipment.",
    createdAt: iso(-37),
    updatedAt: iso(-20),
  },
  {
    code: "INV-0012",
    customer: customer("CUS-0006"),
    status: "partially_paid",
    date: iso(-12),
    dueDate: iso(18),
    currency: "USD",
    summary: summarize([
      line(1, "PRD-0001", "Alderwood standing desk", "pcs", 1, 1450),
      line(2, "PRD-0004", "Linea lateral file cabinet", "pcs", 2, 340),
      line(3, "PRD-0008", "Flux dual monitor arm", "pcs", 2, 150),
    ]),
    items: [
      line(1, "PRD-0001", "Alderwood standing desk", "pcs", 1, 1450),
      line(2, "PRD-0004", "Linea lateral file cabinet", "pcs", 2, 340),
      line(3, "PRD-0008", "Flux dual monitor arm", "pcs", 2, 150),
    ],
    amountPaid: 1200,
    owner: "Amara Osei",
    notes: "",
    createdAt: iso(-14),
    updatedAt: iso(-6),
  },
  {
    code: "INV-0013",
    customer: customer("CUS-0001"),
    status: "paid",
    date: iso(-95),
    dueDate: iso(-65),
    currency: "USD",
    summary: summarize([
      line(1, "PRD-0005", "Boardroom conference table", "pcs", 1, 2200),
      line(2, "PRD-0002", "Aria ergonomic chair", "pcs", 10, 620),
    ]),
    items: [
      line(1, "PRD-0005", "Boardroom conference table", "pcs", 1, 2200),
      line(2, "PRD-0002", "Aria ergonomic chair", "pcs", 10, 620),
    ],
    amountPaid: 8400,
    owner: "Amara Osei",
    salesOrderCode: "SO-2008",
    notes: "Legacy invoice from the first fit-out project.",
    createdAt: iso(-97),
    updatedAt: iso(-65),
  },
  {
    code: "INV-0014",
    customer: customer("CUS-0007"),
    status: "draft",
    date: iso(-1),
    dueDate: iso(29),
    currency: "USD",
    summary: summarize([
      line(1, "PRD-0007", "Acoustic partition panel", "pcs", 3, 410),
      line(2, "PRD-0003", "Lumen task lamp", "pcs", 6, 85),
    ]),
    items: [
      line(1, "PRD-0007", "Acoustic partition panel", "pcs", 3, 410),
      line(2, "PRD-0003", "Lumen task lamp", "pcs", 6, 85),
    ],
    amountPaid: 0,
    owner: "Theo Lindqvist",
    notes: "Draft for the new warehouse office fit-out.",
    createdAt: iso(-2),
    updatedAt: iso(-1),
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

function nextCode(records: SalesInvoice[]): string {
  const max = records.reduce((highest, invoice) => {
    const number = Number(invoice.code.slice(4));
    return number > highest ? number : highest;
  }, 0);
  return `INV-${String(max + 1).padStart(4, "0")}`;
}

function sortValue(invoice: SalesInvoice, sortBy: string): unknown {
  if (sortBy === "customer") return invoice.customer.name;
  if (sortBy === "total") return invoice.summary.total;
  return invoice[sortBy as keyof SalesInvoice];
}

/**
 * Reference data for the Demo Co tenant. This module is the only sales-invoice
 * surface until the ERP gateway lands (M5); endpoints then read from the
 * tenant ERPNext site and keep the same contract.
 */
@Injectable()
export class SalesInvoicesService {
  private records: SalesInvoice[] = structuredClone(SEED);

  summary(): SalesInvoiceSummary {
    const now = Date.now();
    const nowDate = new Date();
    let outstanding = 0;
    let monthBilled = 0;
    let overdue = 0;
    let count = 0;

    for (const invoice of this.records) {
      const remaining = round2(invoice.summary.total - invoice.amountPaid);
      if (invoice.status === "submitted" || invoice.status === "partially_paid" || invoice.status === "overdue") {
        outstanding += remaining;
      }
      if (invoice.status !== "cancelled") {
        count += 1;
        const issued = new Date(invoice.date);
        if (issued.getFullYear() === nowDate.getFullYear() && issued.getMonth() === nowDate.getMonth()) {
          monthBilled += invoice.summary.total;
        }
        if (
          remaining > 0 &&
          invoice.status !== "draft" &&
          invoice.status !== "paid" &&
          new Date(invoice.dueDate).getTime() < now
        ) {
          overdue += remaining;
        }
      }
    }

    return {
      outstanding: round2(outstanding),
      monthBilled: round2(monthBilled),
      overdue: round2(overdue),
      count,
      currency: "USD",
    };
  }

  options(): SalesInvoiceOptions {
    return { customers: SEED_CUSTOMERS, products: SEED_PRODUCTS };
  }

  list(query: SalesInvoiceListQuery): SalesInvoiceListResponse {
    const q = (query.q ?? "").toLowerCase().trim();
    const filtered = this.records.filter((invoice) => {
      if (query.status && invoice.status !== query.status) return false;
      if (!q) return true;
      return [
        invoice.code,
        invoice.customer.code,
        invoice.customer.name,
        invoice.owner ?? "",
        invoice.salesOrderCode ?? "",
        invoice.notes ?? "",
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

  detail(code: string): SalesInvoice {
    const invoice = this.records.find((record) => record.code === code);
    if (!invoice) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Invoice ${code} not found` });
    }
    return invoice;
  }

  create(input: CreateSalesInvoiceInput): SalesInvoice {
    const lines = buildLines(input.items, (code) => SEED_PRODUCTS.find((product) => product.code === code)?.name);
    const date = input.date ?? new Date().toISOString();
    const invoice: SalesInvoice = {
      code: nextCode(this.records),
      customer: customer(input.customerCode),
      status: "draft",
      date,
      dueDate: input.dueDate ?? new Date(new Date(date).getTime() + 30 * DAY_MS).toISOString(),
      currency: input.currency ?? "USD",
      summary: summarize(lines),
      items: lines,
      amountPaid: 0,
      owner: "Amara Osei",
      salesOrderCode: input.salesOrderCode,
      notes: input.notes ?? "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.records.push(invoice);
    return invoice;
  }

  update(code: string, input: UpdateSalesInvoiceInput): SalesInvoice {
    const invoice = this.records.find((record) => record.code === code);
    if (!invoice) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Invoice ${code} not found` });
    }
    if (input.customerCode !== undefined) invoice.customer = customer(input.customerCode);
    if (input.date !== undefined) invoice.date = input.date;
    if (input.dueDate !== undefined) invoice.dueDate = input.dueDate;
    if (input.currency !== undefined) invoice.currency = input.currency;
    if (input.salesOrderCode !== undefined) invoice.salesOrderCode = input.salesOrderCode;
    if (input.notes !== undefined) invoice.notes = input.notes;
    if (input.items !== undefined) {
      invoice.items = buildLines(input.items, (code) => SEED_PRODUCTS.find((product) => product.code === code)?.name);
      invoice.summary = summarize(invoice.items);
    }
    invoice.updatedAt = new Date().toISOString();
    return invoice;
  }

  changeStatus(code: string, input: { status: SalesInvoiceStatus }): SalesInvoice {
    const invoice = this.records.find((record) => record.code === code);
    if (!invoice) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Invoice ${code} not found` });
    }
    invoice.status = input.status;
    invoice.updatedAt = new Date().toISOString();
    return invoice;
  }

  recordPayment(code: string, input: RecordPaymentInput): SalesInvoice {
    const invoice = this.records.find((record) => record.code === code);
    if (!invoice) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Invoice ${code} not found` });
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
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Invoice ${code} not found` });
    }
    this.records.splice(index, 1);
  }
}
