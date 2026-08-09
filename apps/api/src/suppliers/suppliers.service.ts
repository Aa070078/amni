import { Injectable } from "@nestjs/common";
import {
  ErrorCode,
  type CreateSupplierInput,
  type Supplier,
  type SupplierListQuery,
  type SupplierListResponse,
  type UpdateSupplierInput,
} from "@amni/shared";

import { ApiException } from "../common/api.exception";

const DAY_MS = 86_400_000;
const iso = (daysAgo: number): string => new Date(Date.now() - daysAgo * DAY_MS).toISOString();

const SORT_WHITELIST = new Set([
  "code",
  "name",
  "group",
  "currency",
  "status",
  "outstanding",
  "totalPurchases",
  "createdAt",
  "updatedAt",
]);

const SEED: Supplier[] = [
  { code: "SUP-0001", name: "Nordic Timberworks", group: "Raw Materials", email: "sales@nordictimberworks.se", phone: "+46 8 556 120 30", currency: "EUR", paymentTerms: "Net 30", taxId: "SE556123456701", status: "active", outstanding: 0, totalPurchases: 8240, createdAt: iso(110), updatedAt: iso(3) },
  { code: "SUP-0002", name: "Fleetline Metals", group: "Raw Materials", email: "orders@fleetlinemetals.com", phone: "+44 121 555 0134", currency: "GBP", paymentTerms: "Net 30", taxId: "GB123456789", status: "active", outstanding: 1460, totalPurchases: 9120, createdAt: iso(104), updatedAt: iso(8) },
  { code: "SUP-0003", name: "Comet Office Supply", group: "Office", email: "accounts@cometoffice.co.uk", phone: "+44 161 832 4410", currency: "GBP", paymentTerms: "14 days", taxId: "GB987654321", status: "active", outstanding: 0, totalPurchases: 3240, createdAt: iso(98), updatedAt: iso(12) },
  { code: "SUP-0004", name: "Hale Lighting Co.", group: "Lighting", email: "trade@halelighting.com", phone: "+44 207 946 0915", currency: "GBP", paymentTerms: "Net 30", taxId: "GB192837465", status: "active", outstanding: 980, totalPurchases: 6780, createdAt: iso(92), updatedAt: iso(5) },
  { code: "SUP-0005", name: "PackRight Logistics", group: "Logistics", email: "ops@packrightlogistics.com", phone: "+44 113 233 7809", currency: "GBP", paymentTerms: "Net 45", status: "active", outstanding: 0, totalPurchases: 5180, createdAt: iso(86), updatedAt: iso(2) },
  { code: "SUP-0006", name: "Beacon Textiles", group: "Raw Materials", email: "hello@beacontextiles.be", phone: "+32 2 456 7890", currency: "EUR", paymentTerms: "Net 30", status: "active", outstanding: 750, totalPurchases: 4320, createdAt: iso(78), updatedAt: iso(6) },
  { code: "SUP-0007", name: "Vertex Hardware", group: "Hardware", email: "sales@vertexhardware.de", phone: "+49 30 911 302 25", currency: "EUR", paymentTerms: "Net 30", taxId: "DE123456789", status: "active", outstanding: 0, totalPurchases: 2960, createdAt: iso(70), updatedAt: iso(9) },
  { code: "SUP-0008", name: "Paper & Press", group: "Office", email: "billing@paperandpress.co.uk", phone: "+44 161 203 5671", currency: "GBP", paymentTerms: "7 days", status: "inactive", outstanding: 0, totalPurchases: 850, createdAt: iso(55), updatedAt: iso(15) },
];

function nextCode(records: Supplier[]): string {
  const max = records.reduce((highest, supplier) => {
    const number = Number(supplier.code.slice(4));
    return number > highest ? number : highest;
  }, 0);
  return `SUP-${String(max + 1).padStart(4, "0")}`;
}

function sortValue(supplier: Supplier, sortBy: string): unknown {
  return supplier[sortBy as keyof Supplier];
}

/**
 * Reference data for the Demo Co tenant. This module is the only supplier
 * surface until the ERP gateway lands (M5); endpoints then read from the
 * tenant ERPNext site and keep the same contract.
 */
@Injectable()
export class SuppliersService {
  private records: Supplier[] = structuredClone(SEED);

  list(query: SupplierListQuery): SupplierListResponse {
    const q = (query.q ?? "").toLowerCase().trim();
    const filtered = this.records.filter((supplier) => {
      if (query.status && supplier.status !== query.status) return false;
      if (!q) return true;
      return [supplier.code, supplier.name, supplier.group, supplier.email ?? "", supplier.taxId ?? ""]
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

  detail(code: string): Supplier {
    const supplier = this.records.find((record) => record.code === code);
    if (!supplier) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Supplier ${code} not found` });
    }
    return supplier;
  }

  create(input: CreateSupplierInput): Supplier {
    const supplier: Supplier = {
      code: nextCode(this.records),
      name: input.name ?? "Untitled supplier",
      group: input.group ?? "General",
      email: input.email,
      phone: input.phone,
      currency: input.currency ?? "USD",
      paymentTerms: input.paymentTerms,
      taxId: input.taxId,
      status: input.status ?? "active",
      outstanding: input.outstanding ?? 0,
      totalPurchases: input.totalPurchases ?? 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.records.push(supplier);
    return supplier;
  }

  update(code: string, input: UpdateSupplierInput): Supplier {
    const supplier = this.records.find((record) => record.code === code);
    if (!supplier) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Supplier ${code} not found` });
    }
    if (input.name !== undefined) supplier.name = input.name;
    if (input.group !== undefined) supplier.group = input.group;
    if (input.email !== undefined) supplier.email = input.email;
    if (input.phone !== undefined) supplier.phone = input.phone;
    if (input.currency !== undefined) supplier.currency = input.currency;
    if (input.paymentTerms !== undefined) supplier.paymentTerms = input.paymentTerms;
    if (input.taxId !== undefined) supplier.taxId = input.taxId;
    if (input.status !== undefined) supplier.status = input.status;
    if (input.outstanding !== undefined) supplier.outstanding = input.outstanding;
    if (input.totalPurchases !== undefined) supplier.totalPurchases = input.totalPurchases;
    supplier.updatedAt = new Date().toISOString();
    return supplier;
  }

  remove(code: string): void {
    const index = this.records.findIndex((record) => record.code === code);
    if (index === -1) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Supplier ${code} not found` });
    }
    this.records.splice(index, 1);
  }
}
