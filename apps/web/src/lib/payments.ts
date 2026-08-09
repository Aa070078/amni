import type { CreatePaymentInput, Payment, PaymentListQuery, PaymentListResponse } from "@amni/shared";
import { apiRequest, toQueryString } from "./client";

export const paymentsClient = {
  list(query: Partial<PaymentListQuery> = {}): Promise<PaymentListResponse> {
    const { page, pageSize, q, sortBy, sortDir, type } = query;
    return apiRequest<PaymentListResponse>(
      "/finance/payments",
      toQueryString({ page, pageSize, q, sortBy, sortDir, type }),
    );
  },
  detail(code: string): Promise<Payment> {
    return apiRequest<Payment>("/finance/payments", `/${encodeURIComponent(code)}`);
  },
  create(input: CreatePaymentInput): Promise<Payment> {
    return apiRequest<Payment>("/finance/payments", "/", { method: "POST", body: input });
  },
};

export function formatPaymentDate(date: string | null | undefined): string {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(parsed);
}
