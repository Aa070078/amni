import type {
  CreatePurchaseOrderInput,
  PurchaseOrder,
  PurchaseOrderListQuery,
  PurchaseOrderListResponse,
  PurchaseOrderStatus,
  UpdatePurchaseOrderInput,
} from "@amni/shared";

import { apiRequest, toQueryString } from "./client";

export interface PurchaseOrderProductOption {
  code: string;
  name: string;
  uom: string;
  rate: number;
}

export interface PurchaseOrderSupplierOption {
  code: string;
  name: string;
}

export interface PurchaseOrderOptions {
  suppliers: PurchaseOrderSupplierOption[];
  products: PurchaseOrderProductOption[];
}

export const purchaseOrdersClient = {
  list(query: Partial<PurchaseOrderListQuery> = {}): Promise<PurchaseOrderListResponse> {
    const { page, pageSize, q, sortBy, sortDir, status } = query;
    return apiRequest<PurchaseOrderListResponse>(
      "/purchasing/orders",
      toQueryString({ page, pageSize, q, sortBy, sortDir, status }),
    );
  },
  options(): Promise<PurchaseOrderOptions> {
    return apiRequest<PurchaseOrderOptions>("/purchasing/orders", "/options");
  },
  detail(code: string): Promise<PurchaseOrder> {
    return apiRequest<PurchaseOrder>("/purchasing/orders", `/${encodeURIComponent(code)}`);
  },
  create(input: CreatePurchaseOrderInput): Promise<PurchaseOrder> {
    return apiRequest<PurchaseOrder>("/purchasing/orders", "/", { method: "POST", body: input });
  },
  update(code: string, input: UpdatePurchaseOrderInput): Promise<PurchaseOrder> {
    return apiRequest<PurchaseOrder>("/purchasing/orders", `/${encodeURIComponent(code)}`, {
      method: "PATCH",
      body: input,
    });
  },
  changeStatus(code: string, status: PurchaseOrderStatus): Promise<PurchaseOrder> {
    return apiRequest<PurchaseOrder>("/purchasing/orders", `/${encodeURIComponent(code)}/status`, {
      method: "PATCH",
      body: { status },
    });
  },
  remove(code: string): Promise<void> {
    return apiRequest<void>("/purchasing/orders", `/${encodeURIComponent(code)}`, { method: "DELETE" });
  },
};

export function formatPoDate(date: string | null | undefined): string {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(parsed);
}
