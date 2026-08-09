import { Injectable } from "@nestjs/common";
import {
  ErrorCode,
  type PurchaseInvoiceDetail,
  type PurchaseInvoiceListQuery,
  type PurchaseInvoiceListResponse,
  type PurchaseInvoiceSummary,
} from "@amni/shared";

import { ApiException } from "../common/api.exception";
import { PURCHASE_INVOICES } from "./purchasing.reference";

const SORT_KEYS = new Set(["number", "supplierName", "date", "dueDate", "total"]);

function toSummary(invoice: PurchaseInvoiceDetail): PurchaseInvoiceSummary {
  return {
    id: invoice.id,
    number: invoice.number,
    supplierId: invoice.supplierId,
    supplierName: invoice.supplierName,
    date: invoice.date,
    dueDate: invoice.dueDate,
    total: invoice.total,
    paid: invoice.paid,
    outstanding: invoice.outstanding,
    status: invoice.status,
    currency: invoice.currency,
    createdAt: invoice.createdAt,
  };
}

@Injectable()
export class PurchaseInvoicesService {
  list(query: PurchaseInvoiceListQuery): PurchaseInvoiceListResponse {
    const { page, pageSize, sortBy, sortDir, q, status, supplierId } = query;

    let rows = PURCHASE_INVOICES.map(toSummary);
    if (q) {
      const needle = q.toLowerCase();
      rows = rows.filter((invoice) =>
        [invoice.number, invoice.supplierName].some((value) => value.toLowerCase().includes(needle)),
      );
    }
    if (status) rows = rows.filter((invoice) => invoice.status === status);
    if (supplierId) rows = rows.filter((invoice) => invoice.supplierId === supplierId);

    const sortKey = sortBy && SORT_KEYS.has(sortBy) ? sortBy : "number";
    const direction = sortDir === "desc" ? -1 : 1;
    rows = [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === undefined || bv === undefined) return 0;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * direction;
      return String(av).localeCompare(String(bv)) * direction;
    });

    const total = rows.length;
    const start = (page - 1) * pageSize;
    return { items: rows.slice(start, start + pageSize), meta: { total, page, pageSize } };
  }

  getById(id: string): PurchaseInvoiceDetail {
    const invoice = PURCHASE_INVOICES.find((entry) => entry.id === id);
    if (!invoice) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: "Purchase invoice not found" });
    }
    return invoice;
  }
}
