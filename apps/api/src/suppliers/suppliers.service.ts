import { Injectable } from "@nestjs/common";
import { PURCHASING_DOCTYPE, SUPPLIER_FIELDS, buildSupplierDoc, ErpError } from "@amni/erp";
import {
  ErrorCode,
  type CreateSupplierInput,
  type Supplier,
  type SupplierListQuery,
  type SupplierListResponse,
  type UpdateSupplierInput,
} from "@amni/shared";

import { ApiException } from "../common/api.exception";
import type { GatewayRequestMeta, GatewayUser } from "../erp-gateway/erp-gateway.service";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ErpGatewayService } from "../erp-gateway/erp-gateway.service";

const SORT_FIELDS: Record<string, string> = { code: "name", name: "supplier_name", group: "supplier_group", currency: "default_currency", status: "disabled", outstanding: "outstanding_amount", totalPurchases: "total_receipt_amount", createdAt: "creation", updatedAt: "modified" };

function toSupplier(doc: Record<string, unknown>): Supplier {
  const now = new Date().toISOString();
  return {
    code: String(doc.name),
    name: String(doc[SUPPLIER_FIELDS.name] ?? doc.name),
    group: String(doc[SUPPLIER_FIELDS.group] ?? "General"),
    email: doc[SUPPLIER_FIELDS.email] != null ? String(doc[SUPPLIER_FIELDS.email]) : undefined,
    phone: doc[SUPPLIER_FIELDS.phone] != null ? String(doc[SUPPLIER_FIELDS.phone]) : undefined,
    currency: String(doc[SUPPLIER_FIELDS.currency] ?? "USD"),
    paymentTerms: doc[SUPPLIER_FIELDS.paymentTerms] != null ? String(doc[SUPPLIER_FIELDS.paymentTerms]) : undefined,
    taxId: doc[SUPPLIER_FIELDS.taxId] != null ? String(doc[SUPPLIER_FIELDS.taxId]) : undefined,
    status: Number(doc[SUPPLIER_FIELDS.status]) === 1 ? "inactive" : "active",
    outstanding: Number(doc[SUPPLIER_FIELDS.outstanding] ?? 0),
    totalPurchases: Number(doc[SUPPLIER_FIELDS.totalPurchases] ?? 0),
    createdAt: doc.creation != null ? String(doc.creation) : now,
    updatedAt: doc.modified != null ? String(doc.modified) : now,
  };
}

function notFound(code: string): ApiException {
  return new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Supplier ${code} not found` });
}

/**
 * Suppliers surface over the tenant's real ERPNext site (M5-005). Reads and
 * writes go through ErpGatewayService, which resolves the tenant from the
 * authenticated Membership, decrypts the per-tenant service account, and
 * audits every mutation. The platform code IS the ERPNext doc name, so no
 * separate code registry exists.
 *
 * Search, sorting, filtering, pagination, and exact counts execute inside the
 * tenant ERP through Amni's allow-listed bridge query.
 */
@Injectable()
export class SuppliersService {
  constructor(private readonly gateway: ErpGatewayService) {}

  async list(user: GatewayUser, meta: GatewayRequestMeta, query: SupplierListQuery): Promise<SupplierListResponse> {
    const { client } = await this.gateway.scopeFor(user.id, meta.requestId);
    const filters: Record<string, unknown> = {};
    if (query.status) filters.disabled = query.status === "inactive" ? 1 : 0;
    const { items, total } = await client.query<Record<string, unknown>>(PURCHASING_DOCTYPE.supplier, {
      filters,
      q: query.q,
      orderBy: `${SORT_FIELDS[query.sortBy ?? ""] ?? "creation"} ${query.sortDir === "asc" ? "asc" : "desc"}`,
      start: (query.page - 1) * query.pageSize,
      pageLength: query.pageSize,
    });
    const page = query.page;
    const pageSize = query.pageSize;
    return {
      items: items.map(toSupplier),
      meta: { total, page, pageSize },
    };
  }

  async detail(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<Supplier> {
    try {
      const doc = await this.gateway.get(user, meta, PURCHASING_DOCTYPE.supplier, code);
      return toSupplier(doc);
    } catch (err) {
      if (err instanceof ErpError && err.code === ErrorCode.ERP_NOT_FOUND) throw notFound(code);
      throw err;
    }
  }

  async create(user: GatewayUser, meta: GatewayRequestMeta, input: CreateSupplierInput): Promise<Supplier> {
    const code = await this.nextCode(user, meta);
    const doc = await this.gateway.create(user, meta, PURCHASING_DOCTYPE.supplier, {
      name: code,
      ...buildSupplierDoc({
        name: input.name ?? "Untitled supplier",
        group: input.group,
        email: input.email,
        phone: input.phone,
        currency: input.currency,
        paymentTerms: input.paymentTerms,
        taxId: input.taxId,
        status: input.status,
      }),
    });
    return toSupplier(doc);
  }

  async update(user: GatewayUser, meta: GatewayRequestMeta, code: string, input: UpdateSupplierInput): Promise<Supplier> {
    const doc = await this.gateway.update(user, meta, PURCHASING_DOCTYPE.supplier, code, undefined, {
      ...(input.name !== undefined ? { [SUPPLIER_FIELDS.name]: input.name } : {}),
      ...(input.group !== undefined ? { [SUPPLIER_FIELDS.group]: input.group } : {}),
      ...(input.email !== undefined ? { [SUPPLIER_FIELDS.email]: input.email } : {}),
      ...(input.phone !== undefined ? { [SUPPLIER_FIELDS.phone]: input.phone } : {}),
      ...(input.currency !== undefined ? { [SUPPLIER_FIELDS.currency]: input.currency } : {}),
      ...(input.paymentTerms !== undefined ? { [SUPPLIER_FIELDS.paymentTerms]: input.paymentTerms } : {}),
      ...(input.taxId !== undefined ? { [SUPPLIER_FIELDS.taxId]: input.taxId } : {}),
      ...(input.status !== undefined ? { [SUPPLIER_FIELDS.status]: input.status === "inactive" ? 1 : 0 } : {}),
    });
    return toSupplier(doc);
  }

  async remove(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<void> {
    await this.gateway.remove(user, meta, PURCHASING_DOCTYPE.supplier, code);
  }

  private async nextCode(user: GatewayUser, meta: GatewayRequestMeta): Promise<string> {
    const { items } = await this.gateway.list(user, meta, PURCHASING_DOCTYPE.supplier, {
      fields: ["name"],
      limitPageLength: 500,
    });
    const max = items.reduce((highest, doc) => {
      const match = /^SUP-(\d{4})$/.exec(String(doc.name));
      const number = match ? Number(match[1]) : 0;
      return number > highest ? number : highest;
    }, 0);
    return `SUP-${String(max + 1).padStart(4, "0")}`;
  }
}
