import { Injectable } from "@nestjs/common";
import {
  INVENTORY_DOCTYPE,
  SALES_DOCTYPE,
  buildSalesInvoiceDoc,
  recordSalesPaymentEntry,
  type ErpClient,
  type ErpDocLine,
  type ErpSalesInvoiceDoc,
} from "@amni/erp";
import {
  ErrorCode,
  type CreateSalesInvoiceInput,
  type CustomerSummary,
  type RecordPaymentInput,
  type SalesInvoice,
  type SalesInvoiceListQuery,
  type SalesInvoiceListResponse,
  type SalesInvoiceStatus,
  type UpdateSalesInvoiceInput,
} from "@amni/shared";

import { ApiException } from "../common/api.exception";
import { toIso } from "../common/frappe";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ErpGatewayService } from "../erp-gateway/erp-gateway.service";
import {
  translateErpError,
  type GatewayRequestMeta,
  type GatewayUser,
} from "../erp-gateway/erp-gateway.service";

const SORT_WHITELIST = new Set([
  "code",
  "customer",
  "date",
  "dueDate",
  "total",
  "amountPaid",
  "status",
  "owner",
  "createdAt",
  "updatedAt",
]);

export interface ProductOption {
  code: string;
  name: string;
  uom: string;
  rate: number;
}

export interface SalesInvoiceOptions {
  customers: CustomerSummary[];
  products: ProductOption[];
}

export interface SalesInvoiceSummary {
  outstanding: number;
  monthBilled: number;
  overdue: number;
  count: number;
  currency: string;
}

type ErpSalesInvoiceRaw = ErpSalesInvoiceDoc & { creation?: string; modified?: string };

const round2 = (value: number): number => Math.round(value * 100) / 100;

function statusFromErp(doc: ErpSalesInvoiceRaw): SalesInvoiceStatus {
  if (doc.docstatus === 2) return "cancelled";
  if (doc.docstatus === 0) return "draft";
  const total = doc.grand_total ?? 0;
  const remaining = doc.outstanding_amount ?? total;
  if (remaining <= 0) return "paid";
  if (doc.due_date && new Date(doc.due_date).getTime() < Date.now()) return "overdue";
  if (remaining < total) return "partially_paid";
  return "submitted";
}

function toDocLines(items: UpdateSalesInvoiceInput["items"]): ErpDocLine[] {
  return (items ?? []).map((line) => ({
    item_code: line.product,
    item_name: line.name,
    qty: line.qty,
    rate: line.rate,
    amount: round2(line.qty * line.rate),
    uom: line.uom ?? "pcs",
  }));
}

function toItems(lines: ErpDocLine[] | undefined): SalesInvoice["items"] {
  return (lines ?? []).map((line, index) => ({
    lineNo: index + 1,
    product: line.item_code,
    name: line.item_name ?? line.item_code,
    uom: line.uom ?? "pcs",
    qty: line.qty,
    rate: line.rate,
    amount: line.amount ?? round2(line.qty * line.rate),
  }));
}

function toInvoice(doc: ErpSalesInvoiceRaw, customerName?: string): SalesInvoice {
  const items = toItems(doc.items);
  const total = doc.grand_total ?? round2(items.reduce((sum, line) => sum + line.amount, 0));
  const remaining = doc.outstanding_amount ?? total;
  return {
    code: doc.name,
    customer: { code: doc.customer, name: customerName ?? doc.customer },
    status: statusFromErp(doc),
    date: toIso(doc.posting_date),
    dueDate: toIso(doc.due_date ?? doc.posting_date),
    currency: doc.currency ?? "USD",
    summary: { subtotal: round2(total), discount: 0, tax: 0, total: round2(total) },
    items,
    amountPaid: round2(Math.max(total - remaining, 0)),
    owner: (doc as { owner?: string }).owner ?? "",
    salesOrderCode: doc.sales_order,
    notes: doc.notes ?? "",
    createdAt: toIso(doc.creation ?? doc.modified),
    updatedAt: toIso(doc.modified ?? doc.creation),
  };
}

async function fetchCustomerMap(client: ErpClient): Promise<Map<string, string>> {
  const { items } = await client.list<{ name: string; customer_name: string }>(
    SALES_DOCTYPE.customer,
    {
      limitPageLength: 0,
    },
  );
  return new Map(items.map((customer) => [customer.name, customer.customer_name ?? customer.name]));
}

async function resolveCustomer(
  client: ErpClient,
  code: string,
): Promise<{ code: string; name: string }> {
  try {
    const doc = await client.get<{ name: string; customer_name: string }>(
      SALES_DOCTYPE.customer,
      code,
    );
    return { code: doc.name, name: doc.customer_name ?? doc.name };
  } catch {
    return { code, name: code };
  }
}

function sortValue(invoice: SalesInvoice, sortBy: string): unknown {
  if (sortBy === "customer") return invoice.customer.name;
  if (sortBy === "total") return invoice.summary.total;
  return invoice[sortBy as keyof SalesInvoice];
}

/**
 * Sales invoices backed by the tenant's real ERPNext Sales Invoice doctype,
 * with payment recorded through submitted Payment Entry docs (type Receive).
 * Outstanding/overdue/partial states derive from outstanding_amount + due_date.
 */
@Injectable()
export class SalesInvoicesService {
  constructor(private readonly gateway: ErpGatewayService) {}

  async summary(user: GatewayUser, meta: GatewayRequestMeta): Promise<SalesInvoiceSummary> {
    const { client } = await this.gateway.scopeFor(user.id, meta.requestId);
    const { items } = await client.list<ErpSalesInvoiceRaw>(SALES_DOCTYPE.salesInvoice, {
      limitPageLength: 0,
    });

    const now = new Date();
    let outstanding = 0;
    let monthBilled = 0;
    let overdue = 0;
    let count = 0;

    for (const doc of items) {
      const total = doc.grand_total ?? 0;
      const remaining = doc.outstanding_amount ?? total;
      if (doc.docstatus !== 2) {
        count += 1;
        if (doc.posting_date) {
          const issued = new Date(doc.posting_date);
          if (issued.getFullYear() === now.getFullYear() && issued.getMonth() === now.getMonth()) {
            monthBilled += total;
          }
        }
      }
      if (doc.docstatus === 1 && remaining > 0) {
        outstanding += remaining;
        if (doc.due_date && new Date(doc.due_date).getTime() < now.getTime()) {
          overdue += remaining;
        }
      }
    }

    return {
      outstanding: round2(outstanding),
      monthBilled: round2(monthBilled),
      overdue: round2(overdue),
      count,
      currency: "USD",
    };
  }

  async options(user: GatewayUser, meta: GatewayRequestMeta): Promise<SalesInvoiceOptions> {
    const { client } = await this.gateway.scopeFor(user.id, meta.requestId);
    const [customers, products] = await Promise.all([
      client.list<{ name: string; customer_name: string }>(SALES_DOCTYPE.customer, {
        limitPageLength: 0,
      }),
      client.list<{ name: string; item_name: string; stock_uom: string; standard_rate: number }>(
        INVENTORY_DOCTYPE.item,
        { limitPageLength: 0 },
      ),
    ]);
    return {
      customers: customers.items.map((customer) => ({
        code: customer.name,
        name: customer.customer_name ?? customer.name,
      })),
      products: products.items.map((product) => ({
        code: product.name,
        name: product.item_name ?? product.name,
        uom: product.stock_uom ?? "pcs",
        rate: product.standard_rate ?? 0,
      })),
    };
  }

  async list(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    query: SalesInvoiceListQuery,
  ): Promise<SalesInvoiceListResponse> {
    const { client } = await this.gateway.scopeFor(user.id, meta.requestId);
    const [{ items: docs }, customerNames] = await Promise.all([
      client.list<ErpSalesInvoiceRaw>(SALES_DOCTYPE.salesInvoice, { limitPageLength: 0 }),
      fetchCustomerMap(client),
    ]);

    const q = (query.q ?? "").toLowerCase().trim();
    const filtered = docs
      .map((doc) => toInvoice(doc, customerNames.get(doc.customer)))
      .filter((invoice) => {
        if (query.status && invoice.status !== query.status) return false;
        if (!q) return true;
        return [
          invoice.code,
          invoice.customer.code,
          invoice.customer.name,
          invoice.owner ?? "",
          invoice.salesOrderCode ?? "",
          invoice.notes ?? "",
        ]
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

    const start = (query.page - 1) * query.pageSize;
    return {
      items: sorted.slice(start, start + query.pageSize),
      meta: { total: sorted.length, page: query.page, pageSize: query.pageSize },
    };
  }

  async detail(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<SalesInvoice> {
    const { client } = await this.gateway.scopeFor(user.id, meta.requestId);
    const doc = await client
      .get<ErpSalesInvoiceRaw>(SALES_DOCTYPE.salesInvoice, code)
      .catch((err) => translateErpError(err, "Invoice"));
    return toInvoice(doc, (await resolveCustomer(client, doc.customer)).name);
  }

  async create(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    input: CreateSalesInvoiceInput,
  ): Promise<SalesInvoice> {
    const { client, companyId } = await this.gateway.scopeFor(user.id, meta.requestId);
    const created = await client.create<ErpSalesInvoiceDoc>(
      SALES_DOCTYPE.salesInvoice,
      buildSalesInvoiceDoc({
        customer: input.customerCode,
        date: input.date,
        dueDate: input.dueDate,
        currency: input.currency,
        salesOrder: input.salesOrderCode,
        notes: input.notes,
        items: input.items,
      }),
    );
    await this.gateway.audit({
      user,
      meta,
      companyId,
      action: "sales_invoice.create",
      resourceType: SALES_DOCTYPE.salesInvoice,
      resourceId: created.name,
    });
    return toInvoice(created, (await resolveCustomer(client, created.customer)).name);
  }

  async update(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    code: string,
    input: UpdateSalesInvoiceInput,
  ): Promise<SalesInvoice> {
    const { client, companyId } = await this.gateway.scopeFor(user.id, meta.requestId);
    const current = await client
      .get<ErpSalesInvoiceDoc>(SALES_DOCTYPE.salesInvoice, code)
      .catch((err) => translateErpError(err, "Invoice"));
    if (current.docstatus !== 0) {
      throw new ApiException({
        code: ErrorCode.UNPROCESSABLE,
        status: 422,
        message: "Only draft invoices can be updated",
      });
    }

    const patch: Record<string, unknown> = {};
    if (input.customerCode !== undefined) patch.customer = input.customerCode;
    if (input.date !== undefined) patch.posting_date = input.date;
    if (input.dueDate !== undefined) patch.due_date = input.dueDate;
    if (input.currency !== undefined) patch.currency = input.currency;
    if (input.salesOrderCode !== undefined) patch.sales_order = input.salesOrderCode;
    if (input.notes !== undefined) patch.notes = input.notes;
    if (input.items !== undefined) {
      const lines = toDocLines(input.items);
      patch.items = lines;
      patch.grand_total = round2(lines.reduce((sum, line) => sum + line.amount, 0));
    }

    const updated = await client
      .update<ErpSalesInvoiceDoc>(SALES_DOCTYPE.salesInvoice, code, patch)
      .catch((err) => translateErpError(err, "Invoice"));
    await this.gateway.audit({
      user,
      meta,
      companyId,
      action: "sales_invoice.update",
      resourceType: SALES_DOCTYPE.salesInvoice,
      resourceId: code,
    });
    return toInvoice(updated, (await resolveCustomer(client, updated.customer)).name);
  }

  async changeStatus(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    code: string,
    status: SalesInvoiceStatus,
  ): Promise<SalesInvoice> {
    const { client, companyId } = await this.gateway.scopeFor(user.id, meta.requestId);

    if (status === "submitted") {
      const doc = await client
        .submit<ErpSalesInvoiceRaw>(SALES_DOCTYPE.salesInvoice, code)
        .catch((err) => translateErpError(err, "Invoice"));
      await this.gateway.audit({
        user,
        meta,
        companyId,
        action: "sales_invoice.submit",
        resourceType: SALES_DOCTYPE.salesInvoice,
        resourceId: code,
      });
      return toInvoice(doc, (await resolveCustomer(client, doc.customer)).name);
    }

    if (status === "cancelled") {
      const doc = await client
        .cancel<ErpSalesInvoiceRaw>(SALES_DOCTYPE.salesInvoice, code)
        .catch((err) => translateErpError(err, "Invoice"));
      await this.gateway.audit({
        user,
        meta,
        companyId,
        action: "sales_invoice.cancel",
        resourceType: SALES_DOCTYPE.salesInvoice,
        resourceId: code,
      });
      return toInvoice(doc, (await resolveCustomer(client, doc.customer)).name);
    }

    throw new ApiException({
      code: ErrorCode.UNPROCESSABLE,
      status: 422,
      message: `Invoice status ${status} is not supported`,
    });
  }

  async recordPayment(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    code: string,
    input: RecordPaymentInput,
  ): Promise<SalesInvoice> {
    const { client, companyId } = await this.gateway.scopeFor(user.id, meta.requestId);
    const current = await client
      .get<ErpSalesInvoiceRaw>(SALES_DOCTYPE.salesInvoice, code)
      .catch((err) => translateErpError(err, "Invoice"));
    if (current.docstatus !== 1) {
      throw new ApiException({
        code: ErrorCode.UNPROCESSABLE,
        status: 422,
        message: "Payments can only be recorded against submitted invoices",
      });
    }
    const remaining = current.outstanding_amount ?? current.grand_total ?? 0;
    if (remaining > 0 && input.amount > remaining) {
      throw new ApiException({
        code: ErrorCode.UNPROCESSABLE,
        status: 422,
        message: `Payment of ${input.amount} exceeds the remaining balance of ${remaining}`,
      });
    }

    await recordSalesPaymentEntry(client, {
      party: current.customer,
      paidAmount: input.amount,
      method: input.method,
      date: input.date,
      reference: input.reference,
    });
    await this.gateway.audit({
      user,
      meta,
      companyId,
      action: "sales_invoice.record_payment",
      resourceType: SALES_DOCTYPE.salesInvoice,
      resourceId: code,
    });

    const updated = await client
      .get<ErpSalesInvoiceRaw>(SALES_DOCTYPE.salesInvoice, code)
      .catch((err) => translateErpError(err, "Invoice"));
    return toInvoice(updated, (await resolveCustomer(client, updated.customer)).name);
  }

  async remove(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<void> {
    const { client, companyId } = await this.gateway.scopeFor(user.id, meta.requestId);
    const current = await client
      .get<ErpSalesInvoiceDoc>(SALES_DOCTYPE.salesInvoice, code)
      .catch((err) => translateErpError(err, "Invoice"));
    if (current.docstatus !== 0) {
      throw new ApiException({
        code: ErrorCode.UNPROCESSABLE,
        status: 422,
        message: "Only draft invoices can be removed",
      });
    }
    await client
      .delete(SALES_DOCTYPE.salesInvoice, code)
      .catch((err) => translateErpError(err, "Invoice"));
    await this.gateway.audit({
      user,
      meta,
      companyId,
      action: "sales_invoice.remove",
      resourceType: SALES_DOCTYPE.salesInvoice,
      resourceId: code,
    });
  }
}
