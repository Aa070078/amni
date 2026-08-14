import { Injectable } from "@nestjs/common";
import {
  EXPENSE_CLAIM_FIELDS,
  ErpError,
  FINANCE_DOCTYPE,
  buildExpenseClaimDoc,
} from "@amni/erp";
import {
  ErrorCode,
  type CreateExpenseCategoryInput,
  type CreateExpenseClaimInput,
  type CreateExpenseInput,
  type Expense,
  type ExpenseCategoryRecord,
  type ExpenseCategoryListQuery,
  type ExpenseCategoryListResponse,
  type ExpenseCategoryRecordStatus,
  type ExpenseClaim,
  type ExpenseClaimListQuery,
  type ExpenseClaimListResponse,
  type ExpenseClaimStatus,
  type ExpenseListQuery,
  type ExpenseListResponse,
  type ExpensesOverview,
  type ExpenseStatus,
  type UpdateExpenseCategoryInput,
  type UpdateExpenseClaimInput,
  type UpdateExpenseInput,
} from "@amni/shared";

import { ApiException } from "../common/api.exception";
import type { GatewayRequestMeta, GatewayUser } from "../erp-gateway/erp-gateway.service";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ErpGatewayService } from "../erp-gateway/erp-gateway.service";

const DAY_MS = 86_400_000;
const iso = (daysAgo: number): string => new Date(Date.now() - daysAgo * DAY_MS).toISOString();
const round2 = (value: number): number => Math.round(value * 100) / 100;

const SORT_WHITELIST = new Set([
  "code",
  "category",
  "date",
  "amount",
  "status",
  "supplier",
  "claimedBy",
  "createdAt",
  "updatedAt",
]);

const CLAIM_SORT_WHITELIST = new Set(["code", "employee", "department", "total", "status", "createdAt", "updatedAt"]);

const CLAIM_FIELDS = [
  "name",
  "employee",
  "department",
  "remarks",
  "user_remark",
  "expense_type",
  "posting_date",
  "supplier",
  "grand_total",
  "approval_status",
  "expense_approver",
  "payment_reference",
  "status",
  "docstatus",
  "expenses",
  "creation",
  "modified",
];

const SEED_CATEGORIES: ExpenseCategoryRecord[] = [
  { code: "CAT-0001", name: "Travel", color: "blue", status: "active", createdAt: iso(300), updatedAt: iso(60) },
  { code: "CAT-0002", name: "Office supplies", color: "amber", status: "active", createdAt: iso(300), updatedAt: iso(60) },
  { code: "CAT-0003", name: "Utilities", color: "cyan", status: "active", createdAt: iso(300), updatedAt: iso(60) },
  { code: "CAT-0004", name: "Software", color: "violet", status: "active", createdAt: iso(300), updatedAt: iso(60) },
  { code: "CAT-0005", name: "Marketing", color: "rose", status: "active", createdAt: iso(300), updatedAt: iso(60) },
  { code: "CAT-0006", name: "Professional services", color: "emerald", status: "active", createdAt: iso(300), updatedAt: iso(60) },
  { code: "CAT-0007", name: "Rent", color: "orange", status: "active", createdAt: iso(300), updatedAt: iso(60) },
  { code: "CAT-0008", name: "Equipment", color: "lime", status: "active", createdAt: iso(300), updatedAt: iso(60) },
  { code: "CAT-0009", name: "Other", color: "zinc", status: "archived", createdAt: iso(300), updatedAt: iso(90) },
];

/**
 * Maps an ERPNext Expense Claim onto the platform statuses. ERPNext tracks the
 * approval independently of docstatus; a filled payment_reference means the
 * claim was reimbursed, and docstatus 2 (cancelled) is surfaced as rejected.
 */
function toStatus(doc: Record<string, unknown>): ExpenseStatus {
  if (doc.payment_reference) return "paid";
  const docstatus = Number(doc.docstatus ?? 0);
  if (docstatus === 2) return "rejected";
  if (docstatus === 0) return "draft";
  const approval = String(doc.approval_status ?? "");
  if (approval === "Approved") return "approved";
  if (approval === "Rejected") return "rejected";
  return "submitted";
}

function toExpense(doc: Record<string, unknown>): Expense {
  const now = new Date().toISOString();
  return {
    code: String(doc.name),
    category: String(doc.expense_type ?? "other") as Expense["category"],
    date: doc.posting_date != null ? String(doc.posting_date) : now,
    description: doc.remarks != null ? String(doc.remarks) : "",
    supplier: doc.supplier != null ? String(doc.supplier) : undefined,
    amount: Number(doc.grand_total ?? 0),
    currency: "USD",
    vat: 0,
    status: toStatus(doc),
    claimedBy: doc.expense_approver != null ? String(doc.expense_approver) : undefined,
    paymentRef: doc.payment_reference != null ? String(doc.payment_reference) : undefined,
    createdAt: doc.creation != null ? String(doc.creation) : now,
    updatedAt: doc.modified != null ? String(doc.modified) : now,
  };
}

function toClaim(doc: Record<string, unknown>): ExpenseClaim {
  const now = new Date().toISOString();
  const items = Array.isArray(doc.expenses)
    ? (doc.expenses as Record<string, unknown>[]).map((line, index) => ({
        code: `L-${String(index + 1).padStart(4, "0")}`,
        description: line.description != null ? String(line.description) : "",
        category: String(line.expense_type ?? "other") as ExpenseClaim["items"][number]["category"],
        date: line.expense_date != null ? String(line.expense_date) : now,
        amount: Number(line.amount ?? 0),
      }))
    : [];
  const status = toStatus(doc);
  return {
    code: String(doc.name),
    employee: doc.employee != null ? String(doc.employee) : "",
    department: doc.department != null ? String(doc.department) : undefined,
    purpose: doc.remarks != null ? String(doc.remarks) : "",
    items,
    total: Number(doc.grand_total ?? round2(items.reduce((sum, item) => sum + item.amount, 0))),
    currency: "USD",
    status,
    paidDate: status === "paid" && doc.modified != null ? String(doc.modified) : undefined,
    notes: doc.user_remark != null ? String(doc.user_remark) : undefined,
    createdAt: doc.creation != null ? String(doc.creation) : now,
    updatedAt: doc.modified != null ? String(doc.modified) : now,
  };
}

function nextCode(names: string[], prefix: string): string {
  const max = names.reduce((highest, name) => {
    const match = new RegExp(`^${prefix}(\\d{4})$`).exec(name);
    const number = match ? Number(match[1]) : 0;
    return number > highest ? number : highest;
  }, 0);
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

function sortValue<T>(record: T, sortBy: string): unknown {
  return record[sortBy as keyof T];
}

function sortRecords<T>(records: T[], sortBy: string, sortDir: "asc" | "desc"): T[] {
  const direction = sortDir === "asc" ? 1 : -1;
  return [...records].sort((a, b) => {
    const aValue = sortValue(a, sortBy);
    const bValue = sortValue(b, sortBy);
    if (aValue === bValue) return 0;
    if (aValue == null) return 1;
    if (bValue == null) return -1;
    return aValue < bValue ? -1 * direction : direction;
  });
}

function paginate<T>(items: T[], page: number, pageSize: number): { items: T[]; total: number } {
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total: items.length };
}

/**
 * Expense surfaces over the tenant's real ERPNext site (M5-005). Platform
 * expenses (EXP-) and claims (CLM-) both live in the Expense Claim doctype,
 * distinguished by their code prefix; categories stay platform configuration.
 * Statuses map from approval_status/payment_reference/docstatus, and only the
 * real ERPNext transitions are settable (submit, approve, reject, pay).
 */
@Injectable()
export class ExpensesService {
  private categories: ExpenseCategoryRecord[] = structuredClone(SEED_CATEGORIES);

  constructor(private readonly gateway: ErpGatewayService) {}

  async list(user: GatewayUser, meta: GatewayRequestMeta, query: ExpenseListQuery): Promise<ExpenseListResponse> {
    const records = (await this.allClaims(user, meta)).filter((doc) => /^EXP-\d{4}$/.test(String(doc.name))).map(toExpense);
    const q = (query.q ?? "").toLowerCase().trim();
    const filtered = records.filter((expense) => {
      if (query.category && expense.category !== query.category) return false;
      if (query.status && expense.status !== query.status) return false;
      if (!q) return true;
      return [expense.code, expense.description, expense.supplier ?? "", expense.claimedBy ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
    const sortBy = query.sortBy && SORT_WHITELIST.has(query.sortBy) ? query.sortBy : "createdAt";
    const sorted = sortRecords(filtered, sortBy, query.sortDir ?? "desc");
    const { items, total } = paginate(sorted, query.page, query.pageSize);
    return { items, meta: { total, page: query.page, pageSize: query.pageSize } };
  }

  async detail(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<Expense> {
    return toExpense(await this.getClaim(user, meta, code, /^EXP-\d{4}$/, "Expense"));
  }

  async create(user: GatewayUser, meta: GatewayRequestMeta, input: CreateExpenseInput): Promise<Expense> {
    const code = await this.nextCode(user, meta, "EXP-");
    const status = input.status ?? "draft";
    const date = input.date ?? new Date().toISOString();
    const doc = await this.gateway.create(user, meta, FINANCE_DOCTYPE.expenseClaim, {
      name: code,
      ...buildExpenseClaimDoc({
        category: input.category,
        date,
        description: input.description,
        supplier: input.supplier,
        amount: input.amount,
        claimedBy: input.claimedBy,
        paymentRef: status === "paid" ? this.paymentRef(code) : undefined,
      }),
    });
    if (status !== "draft") {
      return toExpense(await this.applyTransition(user, meta, code, status));
    }
    return toExpense(doc);
  }

  async update(user: GatewayUser, meta: GatewayRequestMeta, code: string, input: UpdateExpenseInput): Promise<Expense> {
    const doc = await this.gateway.update(user, meta, FINANCE_DOCTYPE.expenseClaim, code, undefined, {
      ...(input.category !== undefined ? { [EXPENSE_CLAIM_FIELDS.category]: input.category } : {}),
      ...(input.date !== undefined ? { [EXPENSE_CLAIM_FIELDS.date]: input.date } : {}),
      ...(input.description !== undefined ? { [EXPENSE_CLAIM_FIELDS.description]: input.description } : {}),
      ...(input.supplier !== undefined ? { [EXPENSE_CLAIM_FIELDS.supplier]: input.supplier } : {}),
      ...(input.amount !== undefined ? { [EXPENSE_CLAIM_FIELDS.amount]: input.amount } : {}),
      ...(input.claimedBy !== undefined ? { [EXPENSE_CLAIM_FIELDS.claimedBy]: input.claimedBy } : {}),
    });
    return toExpense(doc);
  }

  async changeStatus(user: GatewayUser, meta: GatewayRequestMeta, code: string, input: { status: Expense["status"] }): Promise<Expense> {
    return toExpense(await this.applyTransition(user, meta, code, input.status));
  }

  async remove(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<void> {
    await this.getClaim(user, meta, code, /^EXP-\d{4}$/, "Expense");
    await this.gateway.remove(user, meta, FINANCE_DOCTYPE.expenseClaim, code);
  }

  async overview(user: GatewayUser, meta: GatewayRequestMeta): Promise<ExpensesOverview> {
    const docs = await this.allClaims(user, meta);
    const expenses = docs.filter((doc) => /^EXP-\d{4}$/.test(String(doc.name))).map(toExpense);
    const claims = docs.filter((doc) => /^CLM-\d{4}$/.test(String(doc.name))).map(toClaim);
    const now = new Date();
    const monthSpent = expenses
      .filter((expense) => {
        if (expense.status === "rejected") return false;
        const date = new Date(expense.date);
        return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
      })
      .reduce((sum, expense) => sum + expense.amount, 0);
    const pendingApproval = expenses
      .filter((expense) => expense.status === "submitted" || expense.status === "approved")
      .reduce((sum, expense) => sum + expense.amount, 0);
    const reimbursed = expenses.filter((expense) => expense.status === "paid").reduce((sum, expense) => sum + expense.amount, 0);
    const activeClaims = claims.filter((claim) => claim.status !== "paid" && claim.status !== "rejected").length;

    const categoryTotals = new Map<string, { amount: number; count: number }>();
    for (const expense of expenses) {
      const entry = categoryTotals.get(expense.category) ?? { amount: 0, count: 0 };
      entry.amount += expense.amount;
      entry.count += 1;
      categoryTotals.set(expense.category, entry);
    }
    const topCategories = [...categoryTotals.entries()]
      .map(([category, value]) => ({ category: category as Expense["category"], amount: round2(value.amount), count: value.count }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return {
      asOf: new Date().toISOString(),
      kpis: [
        { id: "spent_month", label: "Spent this month", value: round2(monthSpent), format: "currency", currency: "USD", delta: 12.4, trend: "up", hint: "vs. last month" },
        { id: "pending_approval", label: "Pending approval", value: round2(pendingApproval), format: "currency", currency: "USD", delta: -5.2, trend: "down", hint: "submitted + approved" },
        { id: "reimbursed", label: "Reimbursed YTD", value: round2(reimbursed), format: "currency", currency: "USD", hint: "paid expenses" },
        { id: "active_claims", label: "Open claims", value: activeClaims, format: "number", hint: "not yet paid or rejected" },
      ],
      topCategories,
    };
  }

  async listClaims(user: GatewayUser, meta: GatewayRequestMeta, query: ExpenseClaimListQuery): Promise<ExpenseClaimListResponse> {
    const records = (await this.allClaims(user, meta)).filter((doc) => /^CLM-\d{4}$/.test(String(doc.name))).map(toClaim);
    const q = (query.q ?? "").toLowerCase().trim();
    const filtered = records.filter((claim) => {
      if (query.status && claim.status !== query.status) return false;
      if (!q) return true;
      return [claim.code, claim.employee, claim.department ?? "", claim.purpose].join(" ").toLowerCase().includes(q);
    });
    const sortBy = query.sortBy && CLAIM_SORT_WHITELIST.has(query.sortBy) ? query.sortBy : "createdAt";
    const sorted = sortRecords(filtered, sortBy, query.sortDir ?? "desc");
    const { items, total } = paginate(sorted, query.page, query.pageSize);
    return { items, meta: { total, page: query.page, pageSize: query.pageSize } };
  }

  async detailClaim(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<ExpenseClaim> {
    return toClaim(await this.getClaim(user, meta, code, /^CLM-\d{4}$/, "Expense claim"));
  }

  async createClaim(user: GatewayUser, meta: GatewayRequestMeta, input: CreateExpenseClaimInput): Promise<ExpenseClaim> {
    const code = await this.nextCode(user, meta, "CLM-");
    const now = new Date().toISOString();
    const expenses = input.items.map((item) => ({
      expense_date: item.date,
      expense_type: item.category,
      description: item.description,
      amount: item.amount,
    }));
    const doc = await this.gateway.create(user, meta, FINANCE_DOCTYPE.expenseClaim, {
      name: code,
      [EXPENSE_CLAIM_FIELDS.date]: now,
      [EXPENSE_CLAIM_FIELDS.description]: input.purpose,
      [EXPENSE_CLAIM_FIELDS.amount]: round2(input.items.reduce((sum, item) => sum + item.amount, 0)),
      [EXPENSE_CLAIM_FIELDS.status]: undefined,
      employee: input.employee,
      department: input.department,
      user_remark: input.notes,
      expenses,
    });
    return toClaim(doc);
  }

  async updateClaim(user: GatewayUser, meta: GatewayRequestMeta, code: string, input: UpdateExpenseClaimInput): Promise<ExpenseClaim> {
    const doc = await this.gateway.update(user, meta, FINANCE_DOCTYPE.expenseClaim, code, undefined, {
      ...(input.employee !== undefined ? { employee: input.employee } : {}),
      ...(input.department !== undefined ? { department: input.department } : {}),
      ...(input.purpose !== undefined ? { [EXPENSE_CLAIM_FIELDS.description]: input.purpose } : {}),
      ...(input.notes !== undefined ? { user_remark: input.notes } : {}),
      ...(input.items !== undefined
        ? {
            [EXPENSE_CLAIM_FIELDS.amount]: round2(input.items.reduce((sum, item) => sum + item.amount, 0)),
            expenses: input.items.map((item) => ({
              expense_date: item.date,
              expense_type: item.category,
              description: item.description,
              amount: item.amount,
            })),
          }
        : {}),
    });
    return toClaim(doc);
  }

  async changeClaimStatus(user: GatewayUser, meta: GatewayRequestMeta, code: string, input: { status: ExpenseClaimStatus }): Promise<ExpenseClaim> {
    return toClaim(await this.applyTransition(user, meta, code, input.status));
  }

  async removeClaim(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<void> {
    await this.getClaim(user, meta, code, /^CLM-\d{4}$/, "Expense claim");
    await this.gateway.remove(user, meta, FINANCE_DOCTYPE.expenseClaim, code);
  }

  listCategories(query: ExpenseCategoryListQuery): ExpenseCategoryListResponse {
    const q = (query.q ?? "").toLowerCase().trim();
    const filtered = this.categories.filter((category) => {
      if (query.status && category.status !== query.status) return false;
      if (!q) return true;
      return [category.code, category.name].join(" ").toLowerCase().includes(q);
    });
    const sortBy = query.sortBy ?? "code";
    const sorted = sortRecords(filtered, sortBy, query.sortDir ?? "asc");
    const { items, total } = paginate(sorted, query.page, query.pageSize);
    return { items, meta: { total, page: query.page, pageSize: query.pageSize } };
  }

  createCategory(input: CreateExpenseCategoryInput): ExpenseCategoryRecord {
    const now = new Date().toISOString();
    const category: ExpenseCategoryRecord = {
      code: nextCode(this.categories.map((record) => record.code), "CAT-"),
      name: input.name,
      color: input.color ?? "zinc",
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    this.categories.push(category);
    return category;
  }

  updateCategory(code: string, input: UpdateExpenseCategoryInput): ExpenseCategoryRecord {
    const category = this.categories.find((record) => record.code === code);
    if (!category) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Expense category ${code} not found` });
    }
    if (input.name !== undefined) category.name = input.name;
    if (input.color !== undefined) category.color = input.color;
    category.updatedAt = new Date().toISOString();
    return category;
  }

  changeCategoryStatus(code: string, input: { status: ExpenseCategoryRecordStatus }): ExpenseCategoryRecord {
    const category = this.categories.find((record) => record.code === code);
    if (!category) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Expense category ${code} not found` });
    }
    category.status = input.status;
    category.updatedAt = new Date().toISOString();
    return category;
  }

  removeCategory(code: string): void {
    const index = this.categories.findIndex((record) => record.code === code);
    if (index === -1) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Expense category ${code} not found` });
    }
    this.categories.splice(index, 1);
  }

  private async allClaims(user: GatewayUser, meta: GatewayRequestMeta): Promise<Record<string, unknown>[]> {
    const { items } = await this.gateway.list(user, meta, FINANCE_DOCTYPE.expenseClaim, {
      fields: CLAIM_FIELDS,
      limitPageLength: 500,
    });
    return items;
  }

  private async getClaim(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    code: string,
    pattern: RegExp,
    label: string,
  ): Promise<Record<string, unknown>> {
    if (!pattern.test(code)) throw notFound(code, label);
    try {
      return await this.gateway.get(user, meta, FINANCE_DOCTYPE.expenseClaim, code);
    } catch (err) {
      if (err instanceof ErpError && err.code === ErrorCode.ERP_NOT_FOUND) throw notFound(code, label);
      throw err;
    }
  }

  private async nextCode(user: GatewayUser, meta: GatewayRequestMeta, prefix: string): Promise<string> {
    const { items } = await this.gateway.list(user, meta, FINANCE_DOCTYPE.expenseClaim, {
      fields: ["name"],
      limitPageLength: 500,
    });
    return nextCode(items.map((doc) => String(doc.name)), prefix);
  }

  /**
   * Mirrors the transitions a real Expense Claim allows. The mock and real
   * ERP both record them through the submit/cancel doc actions and the
   * approval_status / payment_reference fields.
   */
  private async applyTransition(user: GatewayUser, meta: GatewayRequestMeta, code: string, status: ExpenseStatus): Promise<Record<string, unknown>> {
    switch (status) {
      case "submitted":
        return this.gateway.update(user, meta, FINANCE_DOCTYPE.expenseClaim, code, "submit", {});
      case "approved":
        return this.gateway.update(user, meta, FINANCE_DOCTYPE.expenseClaim, code, undefined, {
          [EXPENSE_CLAIM_FIELDS.status]: "Approved",
        });
      case "rejected":
        return this.gateway.update(user, meta, FINANCE_DOCTYPE.expenseClaim, code, undefined, {
          [EXPENSE_CLAIM_FIELDS.status]: "Rejected",
        });
      case "paid": {
        await this.gateway.update(user, meta, FINANCE_DOCTYPE.expenseClaim, code, "submit", {});
        return this.gateway.update(user, meta, FINANCE_DOCTYPE.expenseClaim, code, undefined, {
          [EXPENSE_CLAIM_FIELDS.paymentRef]: this.paymentRef(code),
        });
      }
      default:
        throw new ApiException({
          code: ErrorCode.VALIDATION,
          status: 400,
          message: "Expense status is derived from ERPNext; draft cannot be set after submission",
        });
    }
  }

  private paymentRef(code: string): string {
    return `PAID-${code}-${Date.now()}`;
  }
}

function notFound(code: string, label: string): ApiException {
  return new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `${label} ${code} not found` });
}
