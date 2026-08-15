import { Injectable } from "@nestjs/common";
import {
  CUSTOMER_FIELDS,
  SALES_DOCTYPE,
  buildCustomerDoc,
  type ErpClient,
  type ErpCustomerDoc,
} from "@amni/erp";
import {
  type CreateCustomerInput,
  type Customer,
  type CustomerListQuery,
  type CustomerListResponse,
  type UpdateCustomerInput,
} from "@amni/shared";

// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ErpGatewayService } from "../erp-gateway/erp-gateway.service";
import { translateErpError, type GatewayRequestMeta, type GatewayUser } from "../erp-gateway/erp-gateway.service";

const SORT_WHITELIST = new Set([
  "code",
  "name",
  "group",
  "type",
  "currency",
  "status",
  "outstanding",
  "totalSales",
  "createdAt",
  "updatedAt",
]);

type ErpCustomerRaw = ErpCustomerDoc & { creation?: string; modified?: string };

interface CustomerTotals {
  totalSales: number;
  outstanding: number;
}

function toIso(value?: string | null): string {
  if (!value) return new Date(0).toISOString();
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
}

function toCustomer(doc: ErpCustomerRaw, totals?: CustomerTotals): Customer {
  return {
    code: doc.name,
    name: doc.customer_name ?? doc.name,
    type: doc.customer_type === "Individual" ? "individual" : "company",
    group: doc.customer_group ?? "General",
    territory: doc.territory,
    email: doc.email_id,
    phone: doc.mobile_no,
    currency: doc.default_currency ?? "USD",
    paymentTerms: doc.payment_terms,
    status: doc.disabled === 1 ? "inactive" : "active",
    outstanding: totals?.outstanding ?? doc.outstanding_amount ?? 0,
    totalSales: totals?.totalSales ?? doc.total_sales_amount ?? 0,
    createdAt: toIso(doc.creation ?? doc.modified),
    updatedAt: toIso(doc.modified ?? doc.creation),
  };
}

function sortValue(customer: Customer, sortBy: string): unknown {
  return customer[sortBy as keyof Customer];
}

/**
 * Customers backed by the tenant's real ERPNext site. Every call resolves the
 * tenant ERP instance server-side from the session membership, reads/writes the
 * Customer doctype, and audits mutations. The response contract is unchanged.
 */
@Injectable()
export class CustomersService {
  constructor(private readonly gateway: ErpGatewayService) {}

  async list(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    query: CustomerListQuery,
  ): Promise<CustomerListResponse> {
    const { client } = await this.gateway.scopeFor(user.id, meta.requestId);
    const { items: docs } = await client.list<ErpCustomerRaw>(SALES_DOCTYPE.customer, {
      limitPageLength: 0,
    });
    const totals = await fetchSalesTotals(client);

    let records = docs.map((doc) => toCustomer(doc, totals.get(doc.name)));
    if (query.status) {
      records = records.filter((customer) => customer.status === query.status);
    }

    const q = (query.q ?? "").toLowerCase().trim();
    if (q) {
      records = records.filter((customer) =>
        [customer.code, customer.name, customer.group, customer.email ?? "", customer.territory ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }

    const sortBy = query.sortBy && SORT_WHITELIST.has(query.sortBy) ? query.sortBy : "createdAt";
    const sortDir = query.sortDir === "asc" ? 1 : -1;
    const sorted = [...records].sort((a, b) => {
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

  async detail(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<Customer> {
    const { client } = await this.gateway.scopeFor(user.id, meta.requestId);
    const doc = await client
      .get<ErpCustomerRaw>(SALES_DOCTYPE.customer, code)
      .catch((err) => translateErpError(err, "Customer"));
    const totals = await fetchSalesTotals(client);
    return toCustomer(doc, totals.get(doc.name));
  }

  async create(user: GatewayUser, meta: GatewayRequestMeta, input: CreateCustomerInput): Promise<Customer> {
    const { client, companyId } = await this.gateway.scopeFor(user.id, meta.requestId);
    const created = await client.create<ErpCustomerDoc>(
      SALES_DOCTYPE.customer,
      buildCustomerDoc({
        name: input.name ?? "Untitled customer",
        type: input.type,
        group: input.group ?? "General",
        territory: input.territory,
        email: input.email,
        phone: input.phone,
        currency: input.currency ?? "USD",
        paymentTerms: input.paymentTerms,
        status: input.status,
      }),
    );
    await this.gateway.audit({
      user,
      meta,
      companyId,
      action: "customer.create",
      resourceType: SALES_DOCTYPE.customer,
      resourceId: created.name,
    });
    return toCustomer(created);
  }

  async update(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    code: string,
    input: UpdateCustomerInput,
  ): Promise<Customer> {
    const { client, companyId } = await this.gateway.scopeFor(user.id, meta.requestId);
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch[CUSTOMER_FIELDS.name] = input.name;
    if (input.type !== undefined) patch[CUSTOMER_FIELDS.type] = input.type === "individual" ? "Individual" : "Company";
    if (input.group !== undefined) patch[CUSTOMER_FIELDS.group] = input.group;
    if (input.territory !== undefined) patch[CUSTOMER_FIELDS.territory] = input.territory;
    if (input.email !== undefined) patch[CUSTOMER_FIELDS.email] = input.email;
    if (input.phone !== undefined) patch[CUSTOMER_FIELDS.phone] = input.phone;
    if (input.currency !== undefined) patch[CUSTOMER_FIELDS.currency] = input.currency;
    if (input.paymentTerms !== undefined) patch[CUSTOMER_FIELDS.paymentTerms] = input.paymentTerms;
    if (input.status !== undefined) patch[CUSTOMER_FIELDS.status] = input.status === "inactive" ? 1 : 0;

    const updated = await client
      .update<ErpCustomerDoc>(SALES_DOCTYPE.customer, code, patch)
      .catch((err) => translateErpError(err, "Customer"));
    await this.gateway.audit({
      user,
      meta,
      companyId,
      action: "customer.update",
      resourceType: SALES_DOCTYPE.customer,
      resourceId: code,
    });
    return toCustomer(updated);
  }

  async remove(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<void> {
    const { client, companyId } = await this.gateway.scopeFor(user.id, meta.requestId);
    await client.delete(SALES_DOCTYPE.customer, code).catch((err) => translateErpError(err, "Customer"));
    await this.gateway.audit({
      user,
      meta,
      companyId,
      action: "customer.delete",
      resourceType: SALES_DOCTYPE.customer,
      resourceId: code,
    });
  }
}

async function fetchSalesTotals(client: ErpClient): Promise<Map<string, CustomerTotals>> {
  const { items } = await client.list<{ customer: string; grand_total?: number; outstanding_amount?: number; docstatus?: number }>(
    SALES_DOCTYPE.salesInvoice,
    { fields: ["customer", "grand_total", "outstanding_amount", "docstatus"], limitPageLength: 0 },
  );
  const totals = new Map<string, CustomerTotals>();
  for (const doc of items) {
    if (doc.docstatus === 2) continue;
    const entry = totals.get(doc.customer) ?? { totalSales: 0, outstanding: 0 };
    entry.totalSales += doc.grand_total ?? 0;
    entry.outstanding += doc.outstanding_amount ?? 0;
    totals.set(doc.customer, entry);
  }
  return totals;
}
