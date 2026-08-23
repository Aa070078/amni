import { Injectable } from "@nestjs/common";
import {
  INVENTORY_DOCTYPE,
  SALES_DOCTYPE,
  buildQuotationDoc,
  type ErpClient,
  type ErpDocLine,
  type ErpQuotationDoc,
} from "@amni/erp";
import {
  ErrorCode,
  type CreateQuotationInput,
  type DocSummary,
  type Quotation,
  type QuotationListQuery,
  type QuotationListResponse,
  type QuotationStatus,
  type UpdateQuotationInput,
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
  "date",
  "validUntil",
  "status",
  "owner",
  "createdAt",
  "updatedAt",
  "total",
]);

export interface QuotationOptions {
  customers: { code: string; name: string }[];
  products: { code: string; name: string; uom: string; rate: number }[];
}

type ErpQuotationRaw = ErpQuotationDoc & { creation?: string; modified?: string };

const round2 = (value: number): number => Math.round(value * 100) / 100;

function statusFromErp(doc: ErpQuotationRaw): QuotationStatus {
  if (doc.docstatus === 0) return "draft";
  if (doc.docstatus === 2) return "rejected";
  switch (doc.status) {
    case "Sent":
    case "Open":
    case "Replied":
      return "sent";
    case "Ordered":
      return "converted";
    case "Expired":
      return "expired";
    case "Lost":
    case "Cancelled":
      return "rejected";
    case "Draft":
      return "draft";
    default:
      return "sent";
  }
}

function toDocLines(items: UpdateQuotationInput["items"]): ErpDocLine[] {
  return (items ?? []).map((line) => ({
    item_code: line.product,
    item_name: line.name,
    qty: line.qty,
    rate: line.rate,
    amount: round2(line.qty * line.rate),
    uom: line.uom ?? "pcs",
  }));
}

function toItems(lines: ErpDocLine[] | undefined): Quotation["items"] {
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

function summarize(doc: ErpQuotationRaw, lines: ErpDocLine[] | undefined): DocSummary {
  const subtotal = round2(
    (lines ?? []).reduce((sum, line) => sum + (line.amount ?? round2(line.qty * line.rate)), 0),
  );
  const total = doc.grand_total ?? subtotal;
  return {
    subtotal,
    discount: 0,
    tax: round2(Math.max(total - subtotal, 0)),
    total: round2(total),
  };
}

function toQuotation(doc: ErpQuotationRaw, customerName?: string): Quotation {
  const items = toItems(doc.items);
  return {
    code: doc.name,
    customer: { code: doc.customer, name: customerName ?? doc.customer },
    status: statusFromErp(doc),
    date: toIso(doc.transaction_date),
    validUntil: doc.valid_till ? toIso(doc.valid_till) : null,
    currency: doc.currency ?? "USD",
    summary: summarize(doc, doc.items),
    items,
    owner: doc.owner,
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

/**
 * Quotations backed by the tenant's real ERPNext Quotation doctype. Drafts map
 * to docstatus 0, cancelled/lost to rejected; submitted ERP statuses map onto
 * the platform vocabulary. Only drafts can be updated/removed; changeStatus
 * submits or cancels.
 */
@Injectable()
export class QuotationsService {
  constructor(private readonly gateway: ErpGatewayService) {}

  async options(user: GatewayUser, meta: GatewayRequestMeta): Promise<QuotationOptions> {
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
    query: QuotationListQuery,
  ): Promise<QuotationListResponse> {
    const { client } = await this.gateway.scopeFor(user.id, meta.requestId);
    const [{ items: docs }, customerNames] = await Promise.all([
      client.list<ErpQuotationRaw>(SALES_DOCTYPE.quotation, { limitPageLength: 0 }),
      fetchCustomerMap(client),
    ]);

    const q = (query.q ?? "").toLowerCase().trim();
    const filtered = docs
      .map((doc) => toQuotation(doc, customerNames.get(doc.customer)))
      .filter((quotation) => {
        if (query.status && quotation.status !== query.status) return false;
        if (!q) return true;
        return [
          quotation.code,
          quotation.customer.code,
          quotation.customer.name,
          quotation.owner ?? "",
          quotation.notes ?? "",
          ...quotation.items.map((item) => item.name),
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);
      });

    const whitelisted = query.sortBy !== undefined && SORT_WHITELIST.has(query.sortBy);
    const sortBy = whitelisted ? query.sortBy : "createdAt";
    const sortDir = whitelisted && query.sortDir === "asc" ? 1 : -1;
    const sorted = [...filtered].sort((a, b) => {
      const aValue = sortBy === "total" ? a.summary.total : a[sortBy as keyof Quotation];
      const bValue = sortBy === "total" ? b.summary.total : b[sortBy as keyof Quotation];
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

  async detail(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<Quotation> {
    const { client } = await this.gateway.scopeFor(user.id, meta.requestId);
    const doc = await client
      .get<ErpQuotationRaw>(SALES_DOCTYPE.quotation, code)
      .catch((err) => translateErpError(err, "Quotation"));
    return toQuotation(doc, (await resolveCustomer(client, doc.customer)).name);
  }

  async create(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    input: CreateQuotationInput,
  ): Promise<Quotation> {
    const { client, companyId } = await this.gateway.scopeFor(user.id, meta.requestId);
    const created = await client.create<ErpQuotationDoc>(
      SALES_DOCTYPE.quotation,
      buildQuotationDoc({
        customer: input.customerCode,
        date: input.date,
        validUntil: input.validUntil,
        currency: input.currency,
        notes: input.notes,
        items: input.items,
      }),
    );
    await this.gateway.audit({
      user,
      meta,
      companyId,
      action: "quotation.create",
      resourceType: SALES_DOCTYPE.quotation,
      resourceId: created.name,
    });
    return toQuotation(created, (await resolveCustomer(client, created.customer)).name);
  }

  async update(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    code: string,
    input: UpdateQuotationInput,
  ): Promise<Quotation> {
    const { client, companyId } = await this.gateway.scopeFor(user.id, meta.requestId);
    const current = await client
      .get<ErpQuotationDoc>(SALES_DOCTYPE.quotation, code)
      .catch((err) => translateErpError(err, "Quotation"));
    if (current.docstatus !== 0) {
      throw new ApiException({
        code: ErrorCode.UNPROCESSABLE,
        status: 422,
        message: "Only draft quotations can be updated",
      });
    }

    const patch: Record<string, unknown> = {};
    if (input.customerCode !== undefined) patch.customer = input.customerCode;
    if (input.date !== undefined) patch.transaction_date = input.date;
    if (input.validUntil !== undefined) patch.valid_till = input.validUntil;
    if (input.currency !== undefined) patch.currency = input.currency;
    if (input.notes !== undefined) patch.notes = input.notes;
    if (input.items !== undefined) {
      const lines = toDocLines(input.items);
      patch.items = lines;
      patch.grand_total = round2(lines.reduce((sum, line) => sum + line.amount, 0));
    }

    const updated = await client
      .update<ErpQuotationDoc>(SALES_DOCTYPE.quotation, code, patch)
      .catch((err) => translateErpError(err, "Quotation"));
    await this.gateway.audit({
      user,
      meta,
      companyId,
      action: "quotation.update",
      resourceType: SALES_DOCTYPE.quotation,
      resourceId: code,
    });
    return toQuotation(updated, (await resolveCustomer(client, updated.customer)).name);
  }

  async changeStatus(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    code: string,
    status: QuotationStatus,
  ): Promise<Quotation> {
    const { client, companyId } = await this.gateway.scopeFor(user.id, meta.requestId);

    if (status === "sent") {
      const doc = await client
        .submit<ErpQuotationRaw>(SALES_DOCTYPE.quotation, code)
        .catch((err) => translateErpError(err, "Quotation"));
      await this.gateway.audit({
        user,
        meta,
        companyId,
        action: "quotation.submit",
        resourceType: SALES_DOCTYPE.quotation,
        resourceId: code,
      });
      return toQuotation(doc, (await resolveCustomer(client, doc.customer)).name);
    }

    if (status === "rejected") {
      const doc = await client
        .cancel<ErpQuotationRaw>(SALES_DOCTYPE.quotation, code)
        .catch((err) => translateErpError(err, "Quotation"));
      await this.gateway.audit({
        user,
        meta,
        companyId,
        action: "quotation.cancel",
        resourceType: SALES_DOCTYPE.quotation,
        resourceId: code,
      });
      return toQuotation(doc, (await resolveCustomer(client, doc.customer)).name);
    }

    throw new ApiException({
      code: ErrorCode.UNPROCESSABLE,
      status: 422,
      message: `Quotation status ${status} is not supported`,
    });
  }

  async remove(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<void> {
    const { client, companyId } = await this.gateway.scopeFor(user.id, meta.requestId);
    const current = await client
      .get<ErpQuotationDoc>(SALES_DOCTYPE.quotation, code)
      .catch((err) => translateErpError(err, "Quotation"));
    if (current.docstatus !== 0) {
      throw new ApiException({
        code: ErrorCode.UNPROCESSABLE,
        status: 422,
        message: "Only draft quotations can be removed",
      });
    }
    await client
      .delete(SALES_DOCTYPE.quotation, code)
      .catch((err) => translateErpError(err, "Quotation"));
    await this.gateway.audit({
      user,
      meta,
      companyId,
      action: "quotation.remove",
      resourceType: SALES_DOCTYPE.quotation,
      resourceId: code,
    });
  }
}
