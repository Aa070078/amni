import type {
  CreateSalesCustomerInput,
  SalesCustomer,
  SalesCustomerDetail,
  SalesCustomerListResponse,
  UpdateSalesCustomerInput,
} from "@amni/shared";

import { api } from "@/src/lib/api";

export function getCustomers(): Promise<SalesCustomerListResponse> {
  return api<SalesCustomerListResponse>("/sales/customers?page=1&pageSize=100&sortBy=name&sortDir=asc");
}

export function getCustomer(id: string): Promise<SalesCustomerDetail> {
  return api<SalesCustomerDetail>(`/sales/customers/${encodeURIComponent(id)}`);
}

export function createCustomer(input: CreateSalesCustomerInput): Promise<SalesCustomer> {
  return api<SalesCustomer>("/sales/customers", { method: "POST", body: input });
}

export function updateCustomer(id: string, input: UpdateSalesCustomerInput): Promise<SalesCustomer> {
  return api<SalesCustomer>(`/sales/customers/${encodeURIComponent(id)}`, { method: "PATCH", body: input });
}
