import type { BadgeProps } from "@amni/ui";
import type {
  PurchaseInvoiceDetail,
  PurchaseInvoiceListResponse,
  PurchaseInvoiceStatus,
  PurchaseOrderDetail,
  PurchaseOrderListResponse,
  PurchaseOrderStatus,
  SupplierDetail,
  SupplierListResponse,
  SupplierStatus,
} from "@amni/shared";

import { api } from "@/src/lib/api";

export const supplierStatusBadge: Record<SupplierStatus, BadgeProps["variant"]> = {
  active: "success",
  disabled: "secondary",
};

export const purchaseOrderStatusBadge: Record<PurchaseOrderStatus, BadgeProps["variant"]> = {
  received: "success",
  submitted: "outline",
  draft: "secondary",
  cancelled: "destructive",
};

export const purchaseInvoiceStatusBadge: Record<PurchaseInvoiceStatus, BadgeProps["variant"]> = {
  paid: "success",
  partially_paid: "warning",
  submitted: "outline",
  draft: "secondary",
  cancelled: "destructive",
};

export function supplierStatusLabel(status: SupplierStatus): string {
  return status === "active" ? "Active" : "Disabled";
}

export function purchaseOrderStatusLabel(status: PurchaseOrderStatus): string {
  return status[0]!.toUpperCase() + status.slice(1);
}

export function purchaseInvoiceStatusLabel(status: PurchaseInvoiceStatus): string {
  switch (status) {
    case "partially_paid":
      return "Partially paid";
    default:
      return status[0]!.toUpperCase() + status.slice(1);
  }
}

export function getSuppliers(): Promise<SupplierListResponse> {
  return api<SupplierListResponse>("/suppliers?page=1&pageSize=100&sortBy=name&sortDir=asc");
}

export function getSupplier(id: string): Promise<SupplierDetail> {
  return api<SupplierDetail>(`/suppliers/${encodeURIComponent(id)}`);
}

export function getPurchaseOrders(): Promise<PurchaseOrderListResponse> {
  return api<PurchaseOrderListResponse>("/purchase-orders?page=1&pageSize=100&sortBy=number&sortDir=asc");
}

export function getPurchaseOrder(id: string): Promise<PurchaseOrderDetail> {
  return api<PurchaseOrderDetail>(`/purchase-orders/${encodeURIComponent(id)}`);
}

export function getPurchaseInvoices(): Promise<PurchaseInvoiceListResponse> {
  return api<PurchaseInvoiceListResponse>("/purchase-invoices?page=1&pageSize=100&sortBy=number&sortDir=asc");
}

export function getPurchaseInvoice(id: string): Promise<PurchaseInvoiceDetail> {
  return api<PurchaseInvoiceDetail>(`/purchase-invoices/${encodeURIComponent(id)}`);
}
