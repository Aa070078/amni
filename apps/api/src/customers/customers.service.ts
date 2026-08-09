import { Injectable } from "@nestjs/common";
import {
  ErrorCode,
  type CreateCustomerInput,
  type Customer,
  type CustomerListQuery,
  type CustomerListResponse,
  type UpdateCustomerInput,
} from "@amni/shared";

import { ApiException } from "../common/api.exception";

const DAY_MS = 86_400_000;
const iso = (daysAgo: number): string => new Date(Date.now() - daysAgo * DAY_MS).toISOString();

const SORT_WHITELIST = new Set([
  "code",
  "name",
  "group",
  "type",
  "currency",
  "status",
  "outstanding",
  "totalSales",
  "createdAt",
  "updatedAt",
]);

const SEED: Customer[] = [
  { code: "CUS-0001", name: "Serenity Interiors", type: "company", group: "Interior Fit-out", territory: "London", email: "accounts@serenityinteriors.co.uk", phone: "+44 20 7946 0121", currency: "GBP", paymentTerms: "30 days", status: "active", outstanding: 0, totalSales: 15480, createdAt: iso(120), updatedAt: iso(5) },
  { code: "CUS-0002", name: "Lumina Supplies", type: "company", group: "Lighting Distributor", territory: "Manchester", email: "billing@luminasupplies.com", phone: "+44 161 496 0832", currency: "GBP", paymentTerms: "14 days", status: "active", outstanding: 0, totalSales: 8620, createdAt: iso(118), updatedAt: iso(9) },
  { code: "CUS-0003", name: "Atlas Facilities", type: "company", group: "Facilities Management", territory: "Birmingham", email: "ap@atlasfacilities.co.uk", phone: "+44 121 456 7800", currency: "GBP", paymentTerms: "45 days", status: "active", outstanding: 2700, totalSales: 7310, createdAt: iso(112), updatedAt: iso(3) },
  { code: "CUS-0004", name: "Northwind Traders", type: "company", group: "Wholesale", territory: "Leeds", email: "accounts@northwindtraders.com", phone: "+44 113 245 6712", currency: "GBP", paymentTerms: "30 days", status: "active", outstanding: 3890, totalSales: 6120, createdAt: iso(104), updatedAt: iso(12) },
  { code: "CUS-0005", name: "Bluepeak Logistics", type: "company", group: "Logistics", territory: "Bristol", email: "finance@bluepeaklogistics.com", phone: "+44 117 935 2204", currency: "GBP", paymentTerms: "30 days", status: "active", outstanding: 2170, totalSales: 4430, createdAt: iso(96), updatedAt: iso(2) },
  { code: "CUS-0006", name: "Harbor & Sage", type: "company", group: "Hospitality", territory: "Edinburgh", email: "ap@harborandsage.co.uk", phone: "+44 131 555 0907", currency: "GBP", paymentTerms: "Net 30", status: "active", outstanding: 5380, totalSales: 5380, createdAt: iso(88), updatedAt: iso(1) },
  { code: "CUS-0007", name: "Copperwood Co.", type: "company", group: "Retail", territory: "Sheffield", email: "hello@copperwoodco.com", phone: "+44 114 273 9044", currency: "GBP", paymentTerms: "30 days", status: "active", outstanding: 3130, totalSales: 4960, createdAt: iso(80), updatedAt: iso(6) },
  { code: "CUS-0008", name: "Aster Retail Group", type: "company", group: "Retail Chain", territory: "Cardiff", email: "finance@asterretail.co.uk", phone: "+44 29 2078 4521", currency: "GBP", paymentTerms: "60 days", status: "active", outstanding: 0, totalSales: 6810, createdAt: iso(72), updatedAt: iso(4) },
  { code: "CUS-0009", name: "Vantage Healthcare", type: "company", group: "Healthcare", territory: "Glasgow", email: "procurement@vantagehealthcare.co.uk", phone: "+44 141 354 8120", currency: "GBP", paymentTerms: "30 days", status: "active", outstanding: 4920, totalSales: 4920, createdAt: iso(60), updatedAt: iso(7) },
  { code: "CUS-0010", name: "Summit View Hotels", type: "company", group: "Hospitality", territory: "Oxford", email: "accounts@summitviewhotels.com", phone: "+44 1865 900 351", currency: "GBP", paymentTerms: "Net 30", status: "active", outstanding: 10640, totalSales: 10640, createdAt: iso(52), updatedAt: iso(8) },
  { code: "CUS-0011", name: "Milo & Fern Interiors", type: "company", group: "Interior Fit-out", territory: "Dublin", email: "hi@milofern.ie", phone: "+353 1 689 1200", currency: "EUR", paymentTerms: "30 days", status: "active", outstanding: 0, totalSales: 3180, createdAt: iso(40), updatedAt: iso(10) },
  { code: "CUS-0012", name: "Brightway Retail", type: "individual", group: "Retail", territory: "Liverpool", email: "oliver.bright@brightwayretail.co.uk", phone: "+44 151 284 6903", currency: "GBP", paymentTerms: "14 days", status: "inactive", outstanding: 0, totalSales: 940, createdAt: iso(28), updatedAt: iso(15) },
];

function nextCode(records: Customer[]): string {
  const max = records.reduce((highest, customer) => {
    const number = Number(customer.code.slice(4));
    return number > highest ? number : highest;
  }, 0);
  return `CUS-${String(max + 1).padStart(4, "0")}`;
}

function sortValue(customer: Customer, sortBy: string): unknown {
  return customer[sortBy as keyof Customer];
}

/**
 * Reference data for the Demo Co tenant. This module is the only customer
 * surface until the ERP gateway lands (M5); endpoints then read from the
 * tenant ERPNext site and keep the same contract.
 */
@Injectable()
export class CustomersService {
  private records: Customer[] = structuredClone(SEED);

  list(query: CustomerListQuery): CustomerListResponse {
    const q = (query.q ?? "").toLowerCase().trim();
    const filtered = this.records.filter((customer) => {
      if (query.status && customer.status !== query.status) return false;
      if (!q) return true;
      return [customer.code, customer.name, customer.group, customer.email ?? "", customer.territory ?? ""]
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

  detail(code: string): Customer {
    const customer = this.records.find((record) => record.code === code);
    if (!customer) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Customer ${code} not found` });
    }
    return customer;
  }

  create(input: CreateCustomerInput): Customer {
    const customer: Customer = {
      code: nextCode(this.records),
      name: input.name ?? "Untitled customer",
      type: input.type ?? "company",
      group: input.group ?? "General",
      territory: input.territory,
      email: input.email,
      phone: input.phone,
      currency: input.currency ?? "USD",
      paymentTerms: input.paymentTerms,
      status: input.status ?? "active",
      outstanding: input.outstanding ?? 0,
      totalSales: input.totalSales ?? 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.records.push(customer);
    return customer;
  }

  update(code: string, input: UpdateCustomerInput): Customer {
    const customer = this.records.find((record) => record.code === code);
    if (!customer) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Customer ${code} not found` });
    }
    if (input.name !== undefined) customer.name = input.name;
    if (input.type !== undefined) customer.type = input.type;
    if (input.group !== undefined) customer.group = input.group;
    if (input.territory !== undefined) customer.territory = input.territory;
    if (input.email !== undefined) customer.email = input.email;
    if (input.phone !== undefined) customer.phone = input.phone;
    if (input.currency !== undefined) customer.currency = input.currency;
    if (input.paymentTerms !== undefined) customer.paymentTerms = input.paymentTerms;
    if (input.status !== undefined) customer.status = input.status;
    if (input.outstanding !== undefined) customer.outstanding = input.outstanding;
    if (input.totalSales !== undefined) customer.totalSales = input.totalSales;
    customer.updatedAt = new Date().toISOString();
    return customer;
  }

  remove(code: string): void {
    const index = this.records.findIndex((record) => record.code === code);
    if (index === -1) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Customer ${code} not found` });
    }
    this.records.splice(index, 1);
  }
}
