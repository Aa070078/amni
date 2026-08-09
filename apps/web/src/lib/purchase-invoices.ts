import type {
  CreatePurchaseInvoiceInput,
  PurchaseInvoice,
  PurchaseInvoiceListQuery,
  PurchaseInvoiceListResponse,
  PurchaseInvoiceStatus,
  RecordPaymentInput,
  UpdatePurchaseInvoiceInput,
} from "@amni/shared";

import { apiRequest, toQueryString } from "./client";

export interface PurchaseInvoiceProductOption {
  code: string;
  name: string;
  uom: string;
  rate: number;
}

export interface PurchaseInvoiceSupplierOption {
  code: string;
  name: string;
}

export interface PurchaseInvoiceOptions {
  suppliers: PurchaseInvoiceSupplierOption[];
  products: PurchaseInvoiceProductOption[];
}

export const purchaseInvoicesClient = {
  list(query: Partial<PurchaseInvoiceListQuery> = {}): Promise<PurchaseInvoiceListResponse> {
    const { page, pageSize, q, sortBy, sortDir, status } = query;
    return apiRequest<PurchaseInvoiceListResponse>(
      "/purchasing/invoices",
      toQueryString({ page, pageSize, q, sortBy, sortDir, status }),
    );
  },
  options(): Promise<PurchaseInvoiceOptions> {
    return apiRequest<PurchaseInvoiceOptions>("/purchasing/invoices", "/options");
  },
  detail(code: string): Promise<PurchaseInvoice> {
    return apiRequest<PurchaseInvoice>("/purchasing/invoices", `/${encodeURIComponent(code)}`);
  },
  create(input: CreatePurchaseInvoiceInput): Promise<PurchaseInvoice> {
    return apiRequest<PurchaseInvoice>("/purchasing/invoices", "/", { method: "POST", body: input });
  },
  update(code: string, input: UpdatePurchaseInvoiceInput): Promise<PurchaseInvoice> {
    return apiRequest<PurchaseInvoice>("/purchasing/invoices", `/${encodeURIComponent(code)}`, {
      method: "PATCH",
      body: input,
    });
  },
  changeStatus(code: string, status: PurchaseInvoiceStatus): Promise<PurchaseInvoice> {
    return apiRequest<PurchaseInvoice>("/purchasing/invoices", `/${encodeURIComponent(code)}/status`, {
      method: "PATCH",
      body: { status },
    });
  },
  recordPayment(code: string, input: RecordPaymentInput): Promise<PurchaseInvoice> {
    return apiRequest<PurchaseInvoice>("/purchasing/invoices", `/${encodeURIComponent(code)}/pay`, {
      method: "PATCH",
      body: input,
    });
  },
  remove(code: string): Promise<void> {
    return apiRequest<void>("/purchasing/invoices", `/${encodeURIComponent(code)}`, { method: "DELETE" });
  },
};

export function formatPInvDate(date: string | null | undefined): string {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(parsed);
}
