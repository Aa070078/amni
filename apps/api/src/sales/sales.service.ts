import { Injectable } from "@nestjs/common";
import { ErrorCode, type CreateSalesCustomerInput, type SalesCustomer, type SalesCustomerDetail, type SalesCustomerListQuery, type SalesCustomerListResponse, type SalesCustomerOrder, type UpdateSalesCustomerInput } from "@amni/shared";

import { ApiException } from "../common/api.exception";

const SORTABLE_COLUMNS: Record<string, (customer: SalesCustomer) => string | number> = {
  name: (customer) => customer.name.toLowerCase(),
  email: (customer) => (customer.email ?? "").toLowerCase(),
  city: (customer) => (customer.city ?? "").toLowerCase(),
  totalOrders: (customer) => customer.totalOrders,
  totalValue: (customer) => customer.totalValue,
  outstanding: (customer) => customer.outstanding,
  createdAt: (customer) => customer.createdAt,
};

const daysAgo = (days: number): string => new Date(Date.now() - days * 86_400_000).toISOString();

/**
 * Reference data for the Demo Co tenant, mirroring the dashboard module.
 * This is the only Sales surface until the ERP gateway lands (M5); endpoints
 * then read from the tenant ERP site and keep the same contract.
 */
const SEED: SalesCustomer[] = [
  {
    id: "CUS-0001",
    name: "Serenity Interiors",
    email: "billing@serenityinteriors.com",
    phone: "+1 415-555-0142",
    type: "company",
    status: "active",
    currency: "USD",
    city: "San Francisco",
    totalOrders: 9,
    totalValue: 48_200,
    outstanding: 3_250,
    createdAt: daysAgo(310),
    updatedAt: daysAgo(4),
  },
  {
    id: "CUS-0002",
    name: "Lumina Supplies",
    email: "orders@luminasupplies.com",
    phone: "+1 212-555-0177",
    type: "company",
    status: "active",
    currency: "USD",
    city: "New York",
    totalOrders: 14,
    totalValue: 96_400,
    outstanding: 0,
    createdAt: daysAgo(298),
    updatedAt: daysAgo(9),
  },
  {
    id: "CUS-0003",
    name: "Keiko Tanaka",
    email: "keiko.tanaka@example.com",
    type: "individual",
    status: "active",
    currency: "USD",
    city: "Seattle",
    totalOrders: 3,
    totalValue: 2_150,
    outstanding: 540,
    createdAt: daysAgo(186),
    updatedAt: daysAgo(21),
  },
  {
    id: "CUS-0004",
    name: "Northwind Retail Group",
    email: "ap@northwindrg.com",
    phone: "+1 312-555-0119",
    type: "company",
    status: "active",
    currency: "USD",
    city: "Chicago",
    totalOrders: 21,
    totalValue: 182_300,
    outstanding: 12_860,
    createdAt: daysAgo(260),
    updatedAt: daysAgo(2),
  },
  {
    id: "CUS-0005",
    name: "Marcus Webb",
    email: "marcus.webb@example.com",
    type: "individual",
    status: "inactive",
    currency: "USD",
    city: "Austin",
    totalOrders: 1,
    totalValue: 420,
    outstanding: 420,
    createdAt: daysAgo(140),
    updatedAt: daysAgo(66),
  },
  {
    id: "CUS-0006",
    name: "Atlas Facilities",
    email: "accounts@atlasfacilities.co",
    phone: "+44 20 7946 0821",
    type: "company",
    status: "active",
    currency: "GBP",
    city: "London",
    totalOrders: 7,
    totalValue: 61_700,
    outstanding: 8_900,
    createdAt: daysAgo(220),
    updatedAt: daysAgo(1),
  },
  {
    id: "CUS-0007",
    name: "Priscilla Nguyen",
    email: "priscilla.nguyen@example.com",
    phone: "+1 617-555-0163",
    type: "individual",
    status: "active",
    currency: "USD",
    city: "Boston",
    totalOrders: 5,
    totalValue: 3_980,
    outstanding: 0,
    createdAt: daysAgo(95),
    updatedAt: daysAgo(12),
  },
  {
    id: "CUS-0008",
    name: "Vertex Manufacturing",
    email: "purchasing@vertexmfg.com",
    phone: "+1 503-555-0128",
    type: "company",
    status: "inactive",
    currency: "USD",
    city: "Portland",
    totalOrders: 11,
    totalValue: 73_150,
    outstanding: 22_480,
    createdAt: daysAgo(300),
    updatedAt: daysAgo(150),
  },
  {
    id: "CUS-0009",
    name: "Harbor & Vine",
    email: "hello@harborandvine.com",
    type: "company",
    status: "active",
    currency: "USD",
    city: "Charleston",
    totalOrders: 4,
    totalValue: 9_120,
    outstanding: 0,
    createdAt: daysAgo(60),
    updatedAt: daysAgo(6),
  },
  {
    id: "CUS-0010",
    name: "Elena Petrova",
    email: "elena.petrova@example.com",
    phone: "+49 30 555 0198",
    type: "individual",
    status: "active",
    currency: "EUR",
    city: "Berlin",
    totalOrders: 2,
    totalValue: 1_860,
    outstanding: 310,
    createdAt: daysAgo(34),
    updatedAt: daysAgo(3),
  },
];

const ORDER_LINES: Record<string, SalesCustomerOrder[]> = {
  "CUS-0001": [
    { id: "ORD-2041", number: "SO-2041", date: daysAgo(2), status: "invoiced", total: 3_250, currency: "USD" },
    { id: "ORD-2037", number: "SO-2037", date: daysAgo(24), status: "paid", total: 4_780, currency: "USD" },
    { id: "ORD-2029", number: "SO-2029", date: daysAgo(61), status: "paid", total: 2_940, currency: "USD" },
  ],
  "CUS-0002": [
    { id: "ORD-2039", number: "SO-2039", date: daysAgo(9), status: "paid", total: 7_120, currency: "USD" },
    { id: "ORD-2032", number: "SO-2032", date: daysAgo(40), status: "paid", total: 5_600, currency: "USD" },
  ],
  "CUS-0004": [
    { id: "ORD-2042", number: "SO-2042", date: daysAgo(1), status: "submitted", total: 8_900, currency: "USD" },
    { id: "ORD-2038", number: "SO-2038", date: daysAgo(18), status: "invoiced", total: 12_860, currency: "USD" },
    { id: "ORD-2030", number: "SO-2030", date: daysAgo(55), status: "paid", total: 9_400, currency: "USD" },
  ],
  "CUS-0006": [
    { id: "ORD-2040", number: "SO-2040", date: daysAgo(1), status: "invoiced", total: 8_900, currency: "GBP" },
    { id: "ORD-2035", number: "SO-2035", date: daysAgo(33), status: "paid", total: 12_300, currency: "GBP" },
  ],
  "CUS-0008": [
    { id: "ORD-2031", number: "SO-2031", date: daysAgo(52), status: "paid", total: 6_800, currency: "USD" },
  ],
  "CUS-0003": [
    { id: "ORD-2036", number: "SO-2036", date: daysAgo(28), status: "paid", total: 540, currency: "USD" },
  ],
  "CUS-0010": [
    { id: "ORD-2034", number: "SO-2034", date: daysAgo(3), status: "invoiced", total: 310, currency: "EUR" },
  ],
};

@Injectable()
export class SalesService {
  private readonly customers: SalesCustomer[] = SEED.map((customer) => ({ ...customer }));
  private readonly orders: Record<string, SalesCustomerOrder[]> = Object.fromEntries(
    Object.entries(ORDER_LINES).map(([id, lines]) => [id, lines.map((line) => ({ ...line }))]),
  );

  list(query: SalesCustomerListQuery): SalesCustomerListResponse {
    const { page, pageSize, sortBy, sortDir, q, status, type } = query;

    let rows = [...this.customers];

    if (status) {
      rows = rows.filter((customer) => customer.status === status);
    }
    if (type) {
      rows = rows.filter((customer) => customer.type === type);
    }
    if (q) {
      const needle = q.toLowerCase();
      rows = rows.filter((customer) =>
        [customer.name, customer.email, customer.phone, customer.city]
          .filter((value): value is string => typeof value === "string")
          .some((value) => value.toLowerCase().includes(needle)),
      );
    }

    const sortKey = (sortBy && sortBy in SORTABLE_COLUMNS ? sortBy : "name") as keyof typeof SORTABLE_COLUMNS;
    const accessor = SORTABLE_COLUMNS[sortKey]!;
    rows.sort((a, b) => {
      const left = accessor(a);
      const right = accessor(b);
      const result = left < right ? -1 : left > right ? 1 : 0;
      return sortDir === "desc" ? -result : result;
    });

    const total = rows.length;
    const start = (page - 1) * pageSize;
    const items = rows.slice(start, start + pageSize);

    return { items, meta: { total, page, pageSize } };
  }

  getById(id: string): SalesCustomerDetail {
    const customer = this.customers.find((entry) => entry.id === id);
    if (!customer) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: "Customer not found" });
    }
    return { ...customer, recentOrders: this.orders[id] ?? [] };
  }

  create(input: CreateSalesCustomerInput): SalesCustomer {
    const nextNumber = this.customers.reduce((max, customer) => {
      const parsed = Number(customer.id.replace(/^CUS-/, ""));
      return Number.isFinite(parsed) && parsed > max ? parsed : max;
    }, 0);
    const now = new Date().toISOString();
    const customer: SalesCustomer = {
      id: `CUS-${String(nextNumber + 1).padStart(4, "0")}`,
      name: input.name,
      email: input.email,
      phone: input.phone,
      type: input.type,
      status: "active",
      currency: input.currency,
      city: input.city,
      totalOrders: 0,
      totalValue: 0,
      outstanding: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.customers.push(customer);
    return customer;
  }

  update(id: string, input: UpdateSalesCustomerInput): SalesCustomer {
    const customer = this.customers.find((entry) => entry.id === id);
    if (!customer) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: "Customer not found" });
    }
    const updated: SalesCustomer = {
      ...customer,
      ...input,
      updatedAt: new Date().toISOString(),
    };
    Object.assign(customer, updated);
    return updated;
  }
}
