import type {
  CreateSupplierInput,
  Supplier,
  SupplierListQuery,
  SupplierListResponse,
  UpdateSupplierInput,
} from "@amni/shared";

import { apiRequest, toQueryString } from "./client";

export const suppliersClient = {
  list(query: Partial<SupplierListQuery> = {}): Promise<SupplierListResponse> {
    const { page, pageSize, q, sortBy, sortDir, status } = query;
    return apiRequest<SupplierListResponse>(
      "/purchasing/suppliers",
      toQueryString({ page, pageSize, q, sortBy, sortDir, status }),
    );
  },
  detail(code: string): Promise<Supplier> {
    return apiRequest<Supplier>("/purchasing/suppliers", `/${encodeURIComponent(code)}`);
  },
  create(input: CreateSupplierInput): Promise<Supplier> {
    return apiRequest<Supplier>("/purchasing/suppliers", "/", { method: "POST", body: input });
  },
  update(code: string, input: UpdateSupplierInput): Promise<Supplier> {
    return apiRequest<Supplier>("/purchasing/suppliers", `/${encodeURIComponent(code)}`, {
      method: "PATCH",
      body: input,
    });
  },
  remove(code: string): Promise<void> {
    return apiRequest<void>("/purchasing/suppliers", `/${encodeURIComponent(code)}`, { method: "DELETE" });
  },
};
