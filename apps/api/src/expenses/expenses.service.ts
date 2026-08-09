import { Injectable } from "@nestjs/common";
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
  type UpdateExpenseCategoryInput,
  type UpdateExpenseClaimInput,
  type UpdateExpenseInput,
} from "@amni/shared";

import { ApiException } from "../common/api.exception";

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

const SEED: Expense[] = [
  { code: "EXP-0001", category: "rent", date: iso(30), description: "Office rent — South Bank, monthly", supplier: "Riverside Estates", amount: 4200, currency: "USD", vat: 0, status: "paid", claimedBy: "Amara Osei", paymentRef: "RENT-2026-07", createdAt: iso(32), updatedAt: iso(1) },
  { code: "EXP-0002", category: "utilities", date: iso(22), description: "Electricity and water — July", supplier: "City Power & Water", amount: 640, currency: "USD", vat: 0, status: "approved", claimedBy: "Theo Lindqvist", createdAt: iso(23), updatedAt: iso(20) },
  { code: "EXP-0003", category: "software", date: iso(18), description: "Design suite annual licence", supplier: "Lumen Software", amount: 1290, currency: "USD", vat: 258, status: "paid", claimedBy: "Amara Osei", paymentRef: "SW-25501", createdAt: iso(20), updatedAt: iso(15) },
  { code: "EXP-0004", category: "travel", date: iso(12), description: "Client visit — Berlin trade show", supplier: "", amount: 1480, currency: "USD", vat: 0, status: "submitted", claimedBy: "Mina Delacroix", createdAt: iso(13), updatedAt: iso(12) },
  { code: "EXP-0005", category: "marketing", date: iso(8), description: "Banner ads campaign — Q3 launch", supplier: "Brightline Media", amount: 2350, currency: "USD", vat: 470, status: "paid", claimedBy: "Amara Osei", createdAt: iso(9), updatedAt: iso(7) },
  { code: "EXP-0006", category: "office", date: iso(5), description: "Stationery restock", supplier: "Comet Office Supply", amount: 185, currency: "USD", vat: 37, status: "draft", claimedBy: "Theo Lindqvist", createdAt: iso(6), updatedAt: iso(5) },
  { code: "EXP-0007", category: "equipment", date: iso(3), description: "Conference room display unit", supplier: "Vertex Hardware", amount: 980, currency: "USD", vat: 196, status: "submitted", claimedBy: "Mina Delacroix", createdAt: iso(4), updatedAt: iso(3) },
  { code: "EXP-0008", category: "professional_services", date: iso(1), description: "Audit preparation fees", supplier: "Bering & Co.", amount: 2150, currency: "USD", vat: 0, status: "rejected", claimedBy: "Theo Lindqvist", createdAt: iso(2), updatedAt: iso(1) },
];

const SEED_CLAIMS: ExpenseClaim[] = [
  {
    code: "CLM-0001",
    employee: "Mina Delacroix",
    department: "Sales",
    purpose: "Berlin trade show — travel and accommodation",
    items: [
      { code: "L-0001", description: "Flights — return to Berlin", category: "travel", date: iso(12), amount: 820 },
      { code: "L-0002", description: "Hotel — 3 nights", category: "travel", date: iso(11), amount: 460 },
      { code: "L-0003", description: "Meals and incidentals", category: "travel", date: iso(10), amount: 200 },
    ],
    total: 1480,
    currency: "USD",
    status: "approved",
    notes: "Approved per travel policy exception for the trade show.",
    createdAt: iso(13),
    updatedAt: iso(8),
  },
  {
    code: "CLM-0002",
    employee: "Theo Lindqvist",
    department: "Operations",
    purpose: "Office supplies and water cooler service",
    items: [
      { code: "L-0004", description: "Stationery restock", category: "office", date: iso(6), amount: 185 },
      { code: "L-0005", description: "Water cooler service visit", category: "office", date: iso(6), amount: 120 },
    ],
    total: 305,
    currency: "USD",
    status: "submitted",
    createdAt: iso(6),
    updatedAt: iso(5),
  },
  {
    code: "CLM-0003",
    employee: "Amara Osei",
    department: "Finance",
    purpose: "Design suite annual licence",
    items: [{ code: "L-0006", description: "Design suite annual licence", category: "software", date: iso(20), amount: 1290 }],
    total: 1290,
    currency: "USD",
    status: "paid",
    paidDate: iso(14),
    createdAt: iso(20),
    updatedAt: iso(14),
  },
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

function nextCode(records: { code: string }[], prefix: string): string {
  const max = records.reduce((highest, record) => {
    const number = Number(record.code.slice(prefix.length));
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
 * Reference data for the Demo Co tenant. This module is the only expense
 * surface until the ERP gateway lands (M5); endpoints then read from the
 * tenant ERPNext site and keep the same contract.
 */
@Injectable()
export class ExpensesService {
  private records: Expense[] = structuredClone(SEED);
  private claims: ExpenseClaim[] = structuredClone(SEED_CLAIMS);
  private categories: ExpenseCategoryRecord[] = structuredClone(SEED_CATEGORIES);

  list(query: ExpenseListQuery): ExpenseListResponse {
    const q = (query.q ?? "").toLowerCase().trim();
    const filtered = this.records.filter((expense) => {
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

  detail(code: string): Expense {
    const expense = this.records.find((record) => record.code === code);
    if (!expense) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Expense ${code} not found` });
    }
    return expense;
  }

  create(input: CreateExpenseInput): Expense {
    const expense: Expense = {
      code: nextCode(this.records, "EXP-"),
      category: input.category,
      date: input.date ?? new Date().toISOString(),
      description: input.description,
      supplier: input.supplier,
      amount: input.amount,
      currency: input.currency ?? "USD",
      vat: input.vat ?? 0,
      status: input.status ?? "draft",
      claimedBy: input.claimedBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.records.push(expense);
    return expense;
  }

  update(code: string, input: UpdateExpenseInput): Expense {
    const expense = this.records.find((record) => record.code === code);
    if (!expense) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Expense ${code} not found` });
    }
    if (input.category !== undefined) expense.category = input.category;
    if (input.date !== undefined) expense.date = input.date;
    if (input.description !== undefined) expense.description = input.description;
    if (input.supplier !== undefined) expense.supplier = input.supplier;
    if (input.amount !== undefined) expense.amount = input.amount;
    if (input.currency !== undefined) expense.currency = input.currency;
    if (input.vat !== undefined) expense.vat = input.vat;
    if (input.claimedBy !== undefined) expense.claimedBy = input.claimedBy;
    expense.updatedAt = new Date().toISOString();
    return expense;
  }

  changeStatus(code: string, input: { status: Expense["status"] }): Expense {
    const expense = this.detail(code);
    expense.status = input.status;
    expense.updatedAt = new Date().toISOString();
    return expense;
  }

  remove(code: string): void {
    const index = this.records.findIndex((record) => record.code === code);
    if (index === -1) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Expense ${code} not found` });
    }
    this.records.splice(index, 1);
  }

  overview(): ExpensesOverview {
    const now = new Date();
    const monthSpent = this.records
      .filter((expense) => {
        if (expense.status === "rejected") return false;
        const date = new Date(expense.date);
        return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
      })
      .reduce((sum, expense) => sum + expense.amount, 0);
    const pendingApproval = this.records
      .filter((expense) => expense.status === "submitted" || expense.status === "approved")
      .reduce((sum, expense) => sum + expense.amount, 0);
    const reimbursed = this.records
      .filter((expense) => expense.status === "paid")
      .reduce((sum, expense) => sum + expense.amount, 0);
    const activeClaims = this.claims.filter((claim) => claim.status !== "paid" && claim.status !== "rejected").length;

    const categoryTotals = new Map<string, { amount: number; count: number }>();
    for (const expense of this.records) {
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

  listClaims(query: ExpenseClaimListQuery): ExpenseClaimListResponse {
    const q = (query.q ?? "").toLowerCase().trim();
    const filtered = this.claims.filter((claim) => {
      if (query.status && claim.status !== query.status) return false;
      if (!q) return true;
      return [claim.code, claim.employee, claim.department ?? "", claim.purpose].join(" ").toLowerCase().includes(q);
    });

    const sortBy = query.sortBy && CLAIM_SORT_WHITELIST.has(query.sortBy) ? query.sortBy : "createdAt";
    const sorted = sortRecords(filtered, sortBy, query.sortDir ?? "desc");
    const { items, total } = paginate(sorted, query.page, query.pageSize);
    return { items, meta: { total, page: query.page, pageSize: query.pageSize } };
  }

  detailClaim(code: string): ExpenseClaim {
    const claim = this.claims.find((record) => record.code === code);
    if (!claim) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Expense claim ${code} not found` });
    }
    return claim;
  }

  createClaim(input: CreateExpenseClaimInput): ExpenseClaim {
    const now = new Date().toISOString();
    const items = input.items.map((item, index) => ({
      code: `L-${String(index + 1).padStart(4, "0")}`,
      description: item.description,
      category: item.category,
      date: item.date,
      amount: item.amount,
    }));
    const claim: ExpenseClaim = {
      code: nextCode(this.claims, "CLM-"),
      employee: input.employee,
      department: input.department,
      purpose: input.purpose,
      items,
      total: round2(items.reduce((sum, item) => sum + item.amount, 0)),
      currency: input.currency ?? "USD",
      status: "draft",
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    };
    this.claims.push(claim);
    return claim;
  }

  updateClaim(code: string, input: UpdateExpenseClaimInput): ExpenseClaim {
    const claim = this.detailClaim(code);
    if (input.employee !== undefined) claim.employee = input.employee;
    if (input.department !== undefined) claim.department = input.department;
    if (input.purpose !== undefined) claim.purpose = input.purpose;
    if (input.currency !== undefined) claim.currency = input.currency;
    if (input.notes !== undefined) claim.notes = input.notes;
    if (input.items !== undefined) {
      claim.items = input.items.map((item, index) => ({
        code: `L-${String(index + 1).padStart(4, "0")}`,
        description: item.description,
        category: item.category,
        date: item.date,
        amount: item.amount,
      }));
      claim.total = round2(claim.items.reduce((sum, item) => sum + item.amount, 0));
    }
    claim.updatedAt = new Date().toISOString();
    return claim;
  }

  changeClaimStatus(code: string, input: { status: ExpenseClaimStatus }): ExpenseClaim {
    const claim = this.detailClaim(code);
    claim.status = input.status;
    if (input.status === "paid" && !claim.paidDate) {
      claim.paidDate = new Date().toISOString();
    }
    claim.updatedAt = new Date().toISOString();
    return claim;
  }

  removeClaim(code: string): void {
    const index = this.claims.findIndex((record) => record.code === code);
    if (index === -1) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Expense claim ${code} not found` });
    }
    this.claims.splice(index, 1);
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
      code: nextCode(this.categories, "CAT-"),
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
}
