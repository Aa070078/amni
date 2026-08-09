import type {
  CreateExpenseCategoryInput,
  CreateExpenseClaimInput,
  CreateExpenseInput,
  Expense,
  ExpenseCategoryListQuery,
  ExpenseCategoryListResponse,
  ExpenseCategoryRecord,
  ExpenseCategoryRecordStatus,
  ExpenseClaim,
  ExpenseClaimListQuery,
  ExpenseClaimListResponse,
  ExpenseClaimStatus,
  ExpenseListQuery,
  ExpenseListResponse,
  ExpenseStatus,
  ExpensesOverview,
  UpdateExpenseInput,
} from "@amni/shared";
import { apiRequest, toQueryString } from "./client";

export const expensesClient = {
  overview(): Promise<ExpensesOverview> {
    return apiRequest<ExpensesOverview>("/finance/expenses", "/overview");
  },
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
  listClaims(query: Partial<ExpenseClaimListQuery> = {}): Promise<ExpenseClaimListResponse> {
    const { page, pageSize, q, sortBy, sortDir, status } = query;
    return apiRequest<ExpenseClaimListResponse>(
      "/finance/expenses",
      toQueryString({ page, pageSize, q, sortBy, sortDir, status }),
    );
  },
  claimDetail(code: string): Promise<ExpenseClaim> {
    return apiRequest<ExpenseClaim>("/finance/expenses", `/claims/${encodeURIComponent(code)}`);
  },
  createClaim(input: CreateExpenseClaimInput): Promise<ExpenseClaim> {
    return apiRequest<ExpenseClaim>("/finance/expenses", "/claims", { method: "POST", body: input });
  },
  changeClaimStatus(code: string, status: ExpenseClaimStatus): Promise<ExpenseClaim> {
    return apiRequest<ExpenseClaim>("/finance/expenses", `/claims/${encodeURIComponent(code)}/status`, {
      method: "PATCH",
      body: { status },
    });
  },
  removeClaim(code: string): Promise<void> {
    return apiRequest<void>("/finance/expenses", `/claims/${encodeURIComponent(code)}`, { method: "DELETE" });
  },
  listCategories(query: Partial<ExpenseCategoryListQuery> = {}): Promise<ExpenseCategoryListResponse> {
    const { page, pageSize, q, sortBy, sortDir, status } = query;
    return apiRequest<ExpenseCategoryListResponse>(
      "/finance/expenses",
      toQueryString({ page, pageSize, q, sortBy, sortDir, status }),
    );
  },
  createCategory(input: CreateExpenseCategoryInput): Promise<ExpenseCategoryRecord> {
    return apiRequest<ExpenseCategoryRecord>("/finance/expenses", "/categories", { method: "POST", body: input });
  },
  changeCategoryStatus(code: string, status: ExpenseCategoryRecordStatus): Promise<ExpenseCategoryRecord> {
    return apiRequest<ExpenseCategoryRecord>("/finance/expenses", `/categories/${encodeURIComponent(code)}/status`, {
      method: "PATCH",
      body: { status },
    });
  },
  removeCategory(code: string): Promise<void> {
    return apiRequest<void>("/finance/expenses", `/categories/${encodeURIComponent(code)}`, { method: "DELETE" });
  },
};

export function formatExpenseDate(date: string | null | undefined): string {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(parsed);
}
