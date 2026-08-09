import { Injectable } from "@nestjs/common";
import {
  ErrorCode,
  type CreateExpenseInput,
  type Expense,
  type ExpenseListQuery,
  type ExpenseListResponse,
  type ExpenseStatus,
  type UpdateExpenseInput,
} from "@amni/shared";

import { ApiException } from "../common/api.exception";

const DAY_MS = 86_400_000;
const iso = (daysAgo: number): string => new Date(Date.now() - daysAgo * DAY_MS).toISOString();

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

function nextCode(records: Expense[]): string {
  const max = records.reduce((highest, expense) => {
    const number = Number(expense.code.slice(4));
    return number > highest ? number : highest;
  }, 0);
  return `EXP-${String(max + 1).padStart(4, "0")}`;
}

function sortValue(expense: Expense, sortBy: string): unknown {
  return expense[sortBy as keyof Expense];
}

/**
 * Reference data for the Demo Co tenant. This module is the only expense
 * surface until the ERP gateway lands (M5); endpoints then read from the
 * tenant ERPNext site and keep the same contract.
 */
@Injectable()
export class ExpensesService {
  private records: Expense[] = structuredClone(SEED);

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
    const sortDir = query.sortDir === "asc" ? 1 : -1;
    const sorted = [...filtered].sort((a, b) => {
      const aValue = sortValue(a, sortBy);
      const bValue = sortValue(b, sortBy);
      if (aValue === bValue) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      return aValue < bValue ? -1 * sortDir : sortDir;
    });

    const page = query.page;
    const pageSize = query.pageSize;
    const start = (page - 1) * pageSize;
    return {
      items: sorted.slice(start, start + pageSize),
      meta: { total: sorted.length, page, pageSize },
    };
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
      code: nextCode(this.records),
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

  changeStatus(code: string, input: { status: ExpenseStatus }): Expense {
    const expense = this.records.find((record) => record.code === code);
    if (!expense) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Expense ${code} not found` });
    }
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
}
