import { Injectable } from "@nestjs/common";
import {
  ErrorCode,
  type SupplierDetail,
  type SupplierListQuery,
  type SupplierListResponse,
  type SupplierOrderSummary,
  type SupplierStats,
  type SupplierSummary,
} from "@amni/shared";

import { ApiException } from "../common/api.exception";
import { PURCHASE_INVOICES, PURCHASE_ORDERS, SUPPLIERS } from "./purchasing.reference";

const SORT_KEYS = new Set(["name", "territory", "supplierGroup", "balance", "createdAt"]);

function supplierStats(supplierId: string): SupplierStats {
  const orders = PURCHASE_ORDERS.filter((order) => order.supplierId === supplierId && order.status !== "cancelled");
  const invoices = PURCHASE_INVOICES.filter(
    (invoice) => invoice.supplierId === supplierId && invoice.status !== "cancelled",
  );
  const lastOrderAt = orders.map((order) => order.date).sort().at(-1);
  return {
    totalPurchased: invoices.reduce((sum, invoice) => sum + invoice.total, 0),
    totalPaid: invoices.reduce((sum, invoice) => sum + invoice.paid, 0),
    outstanding: invoices.reduce((sum, invoice) => sum + invoice.outstanding, 0),
    orderCount: orders.length,
    lastOrderAt,
  };
}

function recentOrders(supplierId: string): SupplierOrderSummary[] {
  return PURCHASE_ORDERS.filter((order) => order.supplierId === supplierId)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8)
    .map((order) => ({
      id: order.id,
      number: order.number,
      date: order.date,
      total: order.total,
      status: order.status,
    }));
}

function toSummary(supplier: SupplierDetail): SupplierSummary {
  return {
    id: supplier.id,
    name: supplier.name,
    email: supplier.email,
    phone: supplier.phone,
    territory: supplier.territory,
    supplierGroup: supplier.supplierGroup,
    status: supplier.status,
    currency: supplier.currency,
    balance: supplier.balance,
    createdAt: supplier.createdAt,
    updatedAt: supplier.updatedAt,
  };
}

@Injectable()
export class SuppliersService {
  list(query: SupplierListQuery): SupplierListResponse {
    const { page, pageSize, sortBy, sortDir, q, status, territory } = query;

    let rows = SUPPLIERS.map(toSummary);
    if (q) {
      const needle = q.toLowerCase();
      rows = rows.filter((supplier) =>
        [supplier.name, supplier.email, supplier.territory, supplier.supplierGroup]
          .filter((value): value is string => value !== undefined)
          .some((value) => value.toLowerCase().includes(needle)),
      );
    }
    if (status) rows = rows.filter((supplier) => supplier.status === status);
    if (territory) rows = rows.filter((supplier) => supplier.territory === territory);

    const sortKey = sortBy && SORT_KEYS.has(sortBy) ? sortBy : "name";
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

  getById(id: string): SupplierDetail {
    const supplier = SUPPLIERS.find((entry) => entry.id === id);
    if (!supplier) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: "Supplier not found" });
    }
    return { ...supplier, stats: supplierStats(id), recentOrders: recentOrders(id) };
  }
}
