import { Injectable } from "@nestjs/common";
import {
  ErrorCode,
  type CreatePaymentInput,
  type Payment,
  type PaymentListQuery,
  type PaymentListResponse,
} from "@amni/shared";

import { ApiException } from "../common/api.exception";

const DAY_MS = 86_400_000;
const iso = (daysAgo: number): string => new Date(Date.now() - daysAgo * DAY_MS).toISOString();

const SORT_WHITELIST = new Set([
  "code",
  "type",
  "date",
  "party",
  "amount",
  "method",
  "status",
  "recordedBy",
  "invoiceCode",
]);

const SEED: Payment[] = [
  { code: "PAY-0001", type: "incoming", date: iso(2), party: "Serenity Interiors", reference: "STR-00441", invoiceCode: "INV-0003", amount: 5000, currency: "USD", method: "bank_transfer", status: "cleared", recordedBy: "Amara Osei" },
  { code: "PAY-0002", type: "outgoing", date: iso(4), party: "Riverside Estates", reference: "RENT-2026-07", invoiceCode: "PINV-0001", amount: 4200, currency: "USD", method: "bank_transfer", status: "cleared", recordedBy: "Amara Osei" },
  { code: "PAY-0003", type: "incoming", date: iso(6), party: "Copperwood Co.", reference: "CPW-1082", invoiceCode: "INV-0006", amount: 2000, currency: "USD", method: "bank_transfer", status: "cleared", recordedBy: "Theo Lindqvist" },
  { code: "PAY-0004", type: "incoming", date: iso(9), party: "Bluepeak Logistics", reference: "BLP-5540", invoiceCode: "INV-0008", amount: 1000, currency: "USD", method: "card", status: "pending", recordedBy: "Theo Lindqvist" },
  { code: "PAY-0005", type: "outgoing", date: iso(12), party: "Lumen Software", reference: "SW-25501", invoiceCode: "PINV-0003", amount: 1290, currency: "USD", method: "card", status: "cleared", recordedBy: "Amara Osei" },
  { code: "PAY-0006", type: "incoming", date: iso(15), party: "Aster Retail Group", reference: "AST-7712", invoiceCode: "INV-0007", amount: 6810, currency: "USD", method: "bank_transfer", status: "cleared", recordedBy: "Amara Osei" },
  { code: "PAY-0007", type: "outgoing", date: iso(20), party: "Hale Lighting Co.", reference: "HLC-2230", invoiceCode: "PINV-0004", amount: 1000, currency: "USD", method: "ach", status: "cleared", recordedBy: "Theo Lindqvist" },
];

function nextCode(records: Payment[]): string {
  const max = records.reduce((highest, payment) => {
    const number = Number(payment.code.slice(4));
    return number > highest ? number : highest;
  }, 0);
  return `PAY-${String(max + 1).padStart(4, "0")}`;
}

function sortValue(payment: Payment, sortBy: string): unknown {
  return payment[sortBy as keyof Payment];
}

/**
 * Reference data for the Demo Co tenant. This module is the only payment
 * surface until the ERP gateway lands (M5); endpoints then read from the
 * tenant ERPNext site and keep the same contract.
 */
@Injectable()
export class PaymentsService {
  private records: Payment[] = structuredClone(SEED);

  list(query: PaymentListQuery): PaymentListResponse {
    const q = (query.q ?? "").toLowerCase().trim();
    const filtered = this.records.filter((payment) => {
      if (query.type && payment.type !== query.type) return false;
      if (!q) return true;
      return [payment.code, payment.party, payment.reference ?? "", payment.invoiceCode ?? "", payment.recordedBy ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });

    const sortBy = query.sortBy && SORT_WHITELIST.has(query.sortBy) ? query.sortBy : "date";
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

  detail(code: string): Payment {
    const payment = this.records.find((record) => record.code === code);
    if (!payment) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Payment ${code} not found` });
    }
    return payment;
  }

  create(input: CreatePaymentInput): Payment {
    const payment: Payment = {
      code: nextCode(this.records),
      type: input.type,
      date: input.date ?? new Date().toISOString(),
      party: input.party,
      reference: input.reference,
      invoiceCode: input.invoiceCode,
      amount: input.amount,
      currency: input.currency ?? "USD",
      method: input.method ?? "bank_transfer",
      status: "cleared",
      recordedBy: "Amara Osei",
    };
    this.records.push(payment);
    return payment;
  }
}
