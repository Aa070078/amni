import { Injectable } from "@nestjs/common";
import {
  INVENTORY_DOCTYPE,
  SALES_DOCTYPE,
  buildSalesOrderDoc,
  type ErpClient,
  type ErpDocLine,
  type ErpSalesOrderDoc,
} from "@amni/erp";
import {
  ErrorCode,
  type CreateSalesOrderInput,
  type CustomerSummary,
  type DocSummary,
  type SalesOrder,
  type SalesOrderListQuery,
  type SalesOrderListResponse,
  type SalesOrderStatus,
  type UpdateSalesOrderInput,
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
  "deliveryDate",
  "total",
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

export interface SalesOrderOptions {
  customers: CustomerSummary[];
  products: ProductOption[];
}

type ErpSalesOrderRaw = ErpSalesOrderDoc & { creation?: string; modified?: string };

const round2 = (value: number): number => Math.round(value * 100) / 100;

function statusFromErp(doc: ErpSalesOrderRaw): SalesOrderStatus {
  if (doc.docstatus === 2) return "cancelled";
  if (doc.docstatus === 0) return "draft";
  switch (doc.status) {
    case "Completed":
    case "Closed":
      return "completed";
    case "Delivered":
      return "delivered";
    case "Partially Delivered":
      return "partially_delivered";
    case "To Deliver":
    case "To Bill":
    case "To Deliver and Bill":
      return "submitted";
    default:
      return "submitted";
  }
}

function toDocLines(items: UpdateSalesOrderInput["items"]): ErpDocLine[] {
  return (items ?? []).map((line) => ({
    item_code: line.product,
    item_name: line.name,
    qty: line.qty,
    rate: line.rate,
    amount: round2(line.qty * line.rate),
    uom: line.uom ?? "pcs",
  }));
}

function toItems(lines: ErpDocLine[] | undefined): SalesOrder["items"] {
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

function summarize(doc: ErpSalesOrderRaw, lines: ErpDocLine[] | undefined): DocSummary {
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

function toSalesOrder(doc: ErpSalesOrderRaw, customerName?: string): SalesOrder {
  const items = toItems(doc.items);
  return {
    code: doc.name,
    customer: { code: doc.customer, name: customerName ?? doc.customer },
    status: statusFromErp(doc),
    date: toIso(doc.transaction_date),
    deliveryDate: doc.delivery_date ? toIso(doc.delivery_date) : null,
    currency: doc.currency ?? "USD",
    summary: summarize(doc, doc.items),
    items,
    owner: doc.owner,
    quotationCode: doc.quotation,
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

function sortValue(order: SalesOrder, sortBy: string): unknown {
  if (sortBy === "customer") return order.customer.name;
  if (sortBy === "total") return order.summary.total;
  return order[sortBy as keyof SalesOrder];
}

/**
 * Sales orders backed by the tenant's real ERPNext Sales Order doctype.
 * Drafts/cancelled map from docstatus; ERP delivery statuses map onto the
 * platform vocabulary. Only drafts can be updated/removed; changeStatus
 * submits or cancels.
 */
@Injectable()
export class SalesOrdersService {
  constructor(private readonly gateway: ErpGatewayService) {}

  async options(user: GatewayUser, meta: GatewayRequestMeta): Promise<SalesOrderOptions> {
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
    query: SalesOrderListQuery,
  ): Promise<SalesOrderListResponse> {
    const { client } = await this.gateway.scopeFor(user.id, meta.requestId);
    const [{ items: docs }, customerNames] = await Promise.all([
      client.list<ErpSalesOrderRaw>(SALES_DOCTYPE.salesOrder, { limitPageLength: 0 }),
      fetchCustomerMap(client),
    ]);

    const q = (query.q ?? "").toLowerCase().trim();
    const filtered = docs
      .map((doc) => toSalesOrder(doc, customerNames.get(doc.customer)))
      .filter((order) => {
        if (query.status && order.status !== query.status) return false;
        if (!q) return true;
        return [
          order.code,
          order.customer.code,
          order.customer.name,
          order.owner ?? "",
          order.quotationCode ?? "",
          order.notes ?? "",
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

  async detail(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<SalesOrder> {
    const { client } = await this.gateway.scopeFor(user.id, meta.requestId);
    const doc = await client
      .get<ErpSalesOrderRaw>(SALES_DOCTYPE.salesOrder, code)
      .catch((err) => translateErpError(err, "Sales Order"));
    return toSalesOrder(doc, (await resolveCustomer(client, doc.customer)).name);
  }

  async create(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    input: CreateSalesOrderInput,
  ): Promise<SalesOrder> {
    const { client, companyId } = await this.gateway.scopeFor(user.id, meta.requestId);
    const created = await client.create<ErpSalesOrderDoc>(
      SALES_DOCTYPE.salesOrder,
      buildSalesOrderDoc({
        customer: input.customerCode,
        date: input.date,
        deliveryDate: input.deliveryDate,
        currency: input.currency,
        quotation: input.quotationCode,
        notes: input.notes,
        items: input.items,
      }),
    );
    await this.gateway.audit({
      user,
      meta,
      companyId,
      action: "sales_order.create",
      resourceType: SALES_DOCTYPE.salesOrder,
      resourceId: created.name,
    });
    return toSalesOrder(created, (await resolveCustomer(client, created.customer)).name);
  }

  async update(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    code: string,
    input: UpdateSalesOrderInput,
  ): Promise<SalesOrder> {
    const { client, companyId } = await this.gateway.scopeFor(user.id, meta.requestId);
    const current = await client
      .get<ErpSalesOrderDoc>(SALES_DOCTYPE.salesOrder, code)
      .catch((err) => translateErpError(err, "Sales Order"));
    if (current.docstatus !== 0) {
      throw new ApiException({
        code: ErrorCode.UNPROCESSABLE,
        status: 422,
        message: "Only draft sales orders can be updated",
      });
    }

    const patch: Record<string, unknown> = {};
    if (input.customerCode !== undefined) patch.customer = input.customerCode;
    if (input.date !== undefined) patch.transaction_date = input.date;
    if (input.deliveryDate !== undefined) patch.delivery_date = input.deliveryDate;
    if (input.currency !== undefined) patch.currency = input.currency;
    if (input.quotationCode !== undefined) patch.quotation = input.quotationCode;
    if (input.notes !== undefined) patch.notes = input.notes;
    if (input.items !== undefined) {
      const lines = toDocLines(input.items);
      patch.items = lines;
      patch.grand_total = round2(lines.reduce((sum, line) => sum + line.amount, 0));
    }

    const updated = await client
      .update<ErpSalesOrderDoc>(SALES_DOCTYPE.salesOrder, code, patch)
      .catch((err) => translateErpError(err, "Sales Order"));
    await this.gateway.audit({
      user,
      meta,
      companyId,
      action: "sales_order.update",
      resourceType: SALES_DOCTYPE.salesOrder,
      resourceId: code,
    });
    return toSalesOrder(updated, (await resolveCustomer(client, updated.customer)).name);
  }

  async changeStatus(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    code: string,
    status: SalesOrderStatus,
  ): Promise<SalesOrder> {
    const { client, companyId } = await this.gateway.scopeFor(user.id, meta.requestId);

    if (status === "submitted") {
      const doc = await client
        .submit<ErpSalesOrderRaw>(SALES_DOCTYPE.salesOrder, code)
        .catch((err) => translateErpError(err, "Sales Order"));
      await this.gateway.audit({
        user,
        meta,
        companyId,
        action: "sales_order.submit",
        resourceType: SALES_DOCTYPE.salesOrder,
        resourceId: code,
      });
      return toSalesOrder(doc, (await resolveCustomer(client, doc.customer)).name);
    }

    if (status === "cancelled") {
      const doc = await client
        .cancel<ErpSalesOrderRaw>(SALES_DOCTYPE.salesOrder, code)
        .catch((err) => translateErpError(err, "Sales Order"));
      await this.gateway.audit({
        user,
        meta,
        companyId,
        action: "sales_order.cancel",
        resourceType: SALES_DOCTYPE.salesOrder,
        resourceId: code,
      });
      return toSalesOrder(doc, (await resolveCustomer(client, doc.customer)).name);
    }

    throw new ApiException({
      code: ErrorCode.UNPROCESSABLE,
      status: 422,
      message: `Sales order status ${status} is not supported`,
    });
  }

  async remove(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<void> {
    const { client, companyId } = await this.gateway.scopeFor(user.id, meta.requestId);
    const current = await client
      .get<ErpSalesOrderDoc>(SALES_DOCTYPE.salesOrder, code)
      .catch((err) => translateErpError(err, "Sales Order"));
    if (current.docstatus !== 0) {
      throw new ApiException({
        code: ErrorCode.UNPROCESSABLE,
        status: 422,
        message: "Only draft sales orders can be removed",
      });
    }
    await client
      .delete(SALES_DOCTYPE.salesOrder, code)
      .catch((err) => translateErpError(err, "Sales Order"));
    await this.gateway.audit({
      user,
      meta,
      companyId,
      action: "sales_order.remove",
      resourceType: SALES_DOCTYPE.salesOrder,
      resourceId: code,
    });
  }
}
