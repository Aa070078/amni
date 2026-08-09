import { Injectable } from "@nestjs/common";
import {
  ErrorCode,
  type PurchaseOrderDetail,
  type PurchaseOrderListQuery,
  type PurchaseOrderListResponse,
  type PurchaseOrderSummary,
} from "@amni/shared";

import { ApiException } from "../common/api.exception";
import { PURCHASE_ORDERS } from "./purchasing.reference";

const SORT_KEYS = new Set(["number", "supplierName", "date", "expectedDate", "total"]);

function toSummary(order: PurchaseOrderDetail): PurchaseOrderSummary {
  return {
    id: order.id,
    number: order.number,
    supplierId: order.supplierId,
    supplierName: order.supplierName,
    date: order.date,
    expectedDate: order.expectedDate,
    total: order.total,
    status: order.status,
    currency: order.currency,
    createdAt: order.createdAt,
  };
}

@Injectable()
export class PurchaseOrdersService {
  list(query: PurchaseOrderListQuery): PurchaseOrderListResponse {
    const { page, pageSize, sortBy, sortDir, q, status, supplierId } = query;

    let rows = PURCHASE_ORDERS.map(toSummary);
    if (q) {
      const needle = q.toLowerCase();
      rows = rows.filter((order) =>
        [order.number, order.supplierName].some((value) => value.toLowerCase().includes(needle)),
      );
    }
    if (status) rows = rows.filter((order) => order.status === status);
    if (supplierId) rows = rows.filter((order) => order.supplierId === supplierId);

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

  getById(id: string): PurchaseOrderDetail {
    const order = PURCHASE_ORDERS.find((entry) => entry.id === id);
    if (!order) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: "Purchase order not found" });
    }
    return order;
  }
}
