import type {
  CreateCustomerInput,
  Customer,
  CustomerListQuery,
  CustomerListResponse,
  UpdateCustomerInput,
} from "@amni/shared";

import { apiRequest, toQueryString } from "./client";

export const customersClient = {
  list(query: Partial<CustomerListQuery> = {}): Promise<CustomerListResponse> {
    const { page, pageSize, q, sortBy, sortDir, status } = query;
    return apiRequest<CustomerListResponse>(
      "/sales/customers",
      toQueryString({ page, pageSize, q, sortBy, sortDir, status }),
    );
  },
  detail(code: string): Promise<Customer> {
    return apiRequest<Customer>("/sales/customers", `/${encodeURIComponent(code)}`);
  },
  create(input: CreateCustomerInput): Promise<Customer> {
    return apiRequest<Customer>("/sales/customers", "/", { method: "POST", body: input });
  },
  update(code: string, input: UpdateCustomerInput): Promise<Customer> {
    return apiRequest<Customer>("/sales/customers", `/${encodeURIComponent(code)}`, {
      method: "PATCH",
      body: input,
    });
  },
  remove(code: string): Promise<void> {
    return apiRequest<void>("/sales/customers", `/${encodeURIComponent(code)}`, { method: "DELETE" });
  },
};

export function formatCustomerDate(date: string | null | undefined): string {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(parsed);
}
