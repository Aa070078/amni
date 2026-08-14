import { Injectable } from "@nestjs/common";
import { ErpError, FINANCE_DOCTYPE, buildPaymentEntryDoc } from "@amni/erp";
import {
  ErrorCode,
  type CreatePaymentInput,
  type Payment,
  type PaymentListQuery,
  type PaymentListResponse,
} from "@amni/shared";

import { ApiException } from "../common/api.exception";
import type { GatewayRequestMeta, GatewayUser } from "../erp-gateway/erp-gateway.service";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ErpGatewayService } from "../erp-gateway/erp-gateway.service";

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

const LIST_FIELDS = [
  "name",
  "payment_type",
  "party_type",
  "party",
  "posting_date",
  "reference_no",
  "bill_no",
  "paid_amount",
  "received_amount",
  "mode_of_payment",
  "status",
  "docstatus",
  "creation",
  "modified",
];

function notFound(code: string): ApiException {
  return new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Payment ${code} not found` });
}

/**
 * Maps an ERPNext Payment Entry status onto the platform contract. docstatus 0
 * is pending, 1 is cleared; a cancelled entry (docstatus 2) is surfaced as
 * failed because the platform has no cancelled state.
 */
function toStatus(docstatus: unknown): Payment["status"] {
  const status = Number(docstatus ?? 0);
  if (status === 0) return "pending";
  if (status === 2) return "failed";
  return "cleared";
}

function toPayment(doc: Record<string, unknown>): Payment {
  const now = new Date().toISOString();
  const paymentType = String(doc.payment_type ?? "Pay");
  const amount = Number(doc.received_amount ?? doc.paid_amount ?? 0);
  return {
    code: String(doc.name),
    type: paymentType === "Receive" ? "incoming" : "outgoing",
    date: doc.posting_date != null ? String(doc.posting_date) : now,
    party: doc.party != null ? String(doc.party) : "",
    reference: doc.reference_no != null ? String(doc.reference_no) : undefined,
    invoiceCode: doc.bill_no != null ? String(doc.bill_no) : undefined,
    amount,
    currency: "USD",
    method: (doc.mode_of_payment as Payment["method"]) ?? "bank_transfer",
    status: toStatus(doc.docstatus),
    recordedBy: doc.owner != null ? String(doc.owner) : undefined,
  };
}

function sortValue(payment: Payment, sortBy: string): unknown {
  return payment[sortBy as keyof Payment];
}

/**
 * Payments surface over the tenant's real ERPNext site (M5-005). Payments are
 * Payment Entries: incoming maps to Receive/Customer, outgoing to Pay/Supplier.
 * Codes are ERPNext doc names, the supplier invoice link uses Payment Entry's
 * bill_no, and clearing is the submit action.
 */
@Injectable()
export class PaymentsService {
  constructor(private readonly gateway: ErpGatewayService) {}

  async list(user: GatewayUser, meta: GatewayRequestMeta, query: PaymentListQuery): Promise<PaymentListResponse> {
    const { items } = await this.gateway.list(user, meta, FINANCE_DOCTYPE.paymentEntry, {
      fields: LIST_FIELDS,
      limitPageLength: 500,
    });
    const records = items.map(toPayment);
    const q = (query.q ?? "").toLowerCase().trim();
    const filtered = records.filter((payment) => {
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

  async detail(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<Payment> {
    try {
      return toPayment(await this.gateway.get(user, meta, FINANCE_DOCTYPE.paymentEntry, code));
    } catch (err) {
      if (err instanceof ErpError && err.code === ErrorCode.ERP_NOT_FOUND) throw notFound(code);
      throw err;
    }
  }

  async create(user: GatewayUser, meta: GatewayRequestMeta, input: CreatePaymentInput): Promise<Payment> {
    const paymentType: "Pay" | "Receive" = input.type === "incoming" ? "Receive" : "Pay";
    const partyType: "Supplier" | "Customer" = input.type === "incoming" ? "Customer" : "Supplier";
    const code = await this.nextCode(user, meta);
    const date = input.date ?? new Date().toISOString();
    await this.gateway.create(user, meta, FINANCE_DOCTYPE.paymentEntry, {
      name: code,
      ...buildPaymentEntryDoc({
        party: input.party,
        partyType,
        paymentType,
        paidAmount: input.amount,
        method: input.method ?? "bank_transfer",
        date,
        reference: input.reference,
      }),
      bill_no: input.invoiceCode,
      owner: user.email,
    });
    const submitted = await this.gateway.update(user, meta, FINANCE_DOCTYPE.paymentEntry, code, "submit", {});
    return toPayment(submitted);
  }

  private async nextCode(user: GatewayUser, meta: GatewayRequestMeta): Promise<string> {
    const { items } = await this.gateway.list(user, meta, FINANCE_DOCTYPE.paymentEntry, {
      fields: ["name"],
      limitPageLength: 500,
    });
    const max = items.reduce((highest, doc) => {
      const match = /^PAY-(\d{4})$/.exec(String(doc.name));
      const number = match ? Number(match[1]) : 0;
      return number > highest ? number : highest;
    }, 0);
    return `PAY-${String(max + 1).padStart(4, "0")}`;
  }
}
