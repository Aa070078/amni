import type {
  CreateExpenseInput,
  Expense,
  ExpenseListQuery,
  ExpenseListResponse,
  ExpenseStatus,
  UpdateExpenseInput,
} from "@amni/shared";
import { apiRequest, toQueryString } from "./client";

export const expensesClient = {
  list(query: Partial<ExpenseListQuery> = {}): Promise<ExpenseListResponse> {
    const { page, pageSize, q, sortBy, sortDir, category, status } = query;
    return apiRequest<ExpenseListResponse>(
      "/finance/expenses",
      toQueryString({ page, pageSize, q, sortBy, sortDir, category, status }),
    );
  },
  detail(code: string): Promise<Expense> {
    return apiRequest<Expense>("/finance/expenses", `/${encodeURIComponent(code)}`);
  },
  create(input: CreateExpenseInput): Promise<Expense> {
    return apiRequest<Expense>("/finance/expenses", "/", { method: "POST", body: input });
  },
  update(code: string, input: UpdateExpenseInput): Promise<Expense> {
    return apiRequest<Expense>("/finance/expenses", `/${encodeURIComponent(code)}`, { method: "PATCH", body: input });
  },
  changeStatus(code: string, status: ExpenseStatus): Promise<Expense> {
    return apiRequest<Expense>("/finance/expenses", `/${encodeURIComponent(code)}/status`, {
      method: "PATCH",
      body: { status },
    });
  },
  remove(code: string): Promise<void> {
    return apiRequest<void>("/finance/expenses", `/${encodeURIComponent(code)}`, { method: "DELETE" });
  },
};

export function formatExpenseDate(date: string | null | undefined): string {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(parsed);
}
