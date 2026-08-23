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

const SORT_FIELDS: Record<string, string> = { code: "name", name: "customer_name", group: "customer_group", type: "customer_type", currency: "default_currency", status: "disabled", createdAt: "creation", updatedAt: "modified" };

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
    const filters: Record<string, unknown> = {};
    if (query.status) filters.disabled = query.status === "inactive" ? 1 : 0;
    const { items: docs, total } = await client.query<ErpCustomerRaw>(SALES_DOCTYPE.customer, {
      filters,
      q: query.q,
      orderBy: `${SORT_FIELDS[query.sortBy ?? ""] ?? "creation"} ${query.sortDir === "asc" ? "asc" : "desc"}`,
      start: (query.page - 1) * query.pageSize,
      pageLength: query.pageSize,
    });
    const totals = await fetchSalesTotals(client, docs.map((doc) => doc.name));
    return {
      items: docs.map((doc) => toCustomer(doc, totals.get(doc.name))),
      meta: { total, page: query.page, pageSize: query.pageSize },
    };
  }

  async detail(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<Customer> {
    const { client } = await this.gateway.scopeFor(user.id, meta.requestId);
    const doc = await client
      .get<ErpCustomerRaw>(SALES_DOCTYPE.customer, code)
      .catch((err) => translateErpError(err, "Customer"));
    const totals = await fetchSalesTotals(client, [doc.name]);
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

async function fetchSalesTotals(client: ErpClient, customers: string[]): Promise<Map<string, CustomerTotals>> {
  const { items } = await client.call<{ items: Array<{ customer: string; total_sales?: number; outstanding?: number }> }>("amni_bridge.api.get_customer_sales_totals", { customers });
  const totals = new Map<string, CustomerTotals>();
  for (const doc of items) {
    totals.set(doc.customer, { totalSales: doc.total_sales ?? 0, outstanding: doc.outstanding ?? 0 });
  }
  return totals;
}
