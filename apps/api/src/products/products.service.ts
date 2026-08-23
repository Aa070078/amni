import { Injectable } from "@nestjs/common";
import {
  INVENTORY_DOCTYPE,
  ITEM_FIELDS,
  buildItemDoc,
  type ErpItemDoc,
} from "@amni/erp";
import {
  type CreateProductInput,
  type Product,
  type ProductListQuery,
  type ProductListResponse,
  type UpdateProductInput,
} from "@amni/shared";

import { toIso } from "../common/frappe";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ErpGatewayService } from "../erp-gateway/erp-gateway.service";
import { translateErpError, type GatewayRequestMeta, type GatewayUser } from "../erp-gateway/erp-gateway.service";

const SORT_FIELDS: Record<string, string> = { name: "item_name", price: "standard_rate", cost: "valuation_rate", category: "item_group", createdAt: "creation" };

type ErpItemRaw = ErpItemDoc & { creation?: string; modified?: string };

function toProduct(doc: ErpItemRaw): Product {
  return {
    code: doc.name,
    sku: doc.item_code ?? doc.name,
    name: doc.item_name ?? doc.item_code ?? doc.name,
    category: doc.item_group ?? "Products",
    unit: doc.stock_uom ?? "pcs",
    price: doc.standard_rate ?? 0,
    cost: doc.valuation_rate ?? 0,
    currency: "USD",
    status: doc.disabled === 1 ? "disabled" : "active",
    description: doc.description,
    reorderLevel: (doc as ErpItemRaw & { safety_stock?: number }).safety_stock ?? 0,
    isStockItem: doc.is_stock_item !== 0,
    isSalesItem: doc.is_sales_item !== 0,
    isPurchaseItem: doc.is_purchase_item === 1,
    vatRate: 0,
    createdAt: toIso(doc.creation ?? doc.modified),
    updatedAt: toIso(doc.modified ?? doc.creation),
  };
}

/**
 * Products backed by the tenant's real ERPNext Item doctype. Response contract
 * unchanged; mutations audited. Tax rates live in ERPNext item tax templates,
 * so `vatRate` is not round-tripped (reported as 0).
 */
@Injectable()
export class ProductsService {
  constructor(private readonly gateway: ErpGatewayService) {}

  async list(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    query: ProductListQuery,
  ): Promise<ProductListResponse> {
    const { client } = await this.gateway.scopeFor(user.id, meta.requestId);
    const sortField = SORT_FIELDS[query.sortBy ?? ""] ?? "creation";
    const filters: Record<string, unknown> = {};
    if (query.category) filters.item_group = query.category;
    if (query.status) filters.disabled = query.status === "disabled" ? 1 : 0;
    const { items: docs, total } = await client.query<ErpItemRaw>(INVENTORY_DOCTYPE.item, {
      filters,
      q: query.q,
      orderBy: `${sortField} ${query.sortDir === "asc" ? "asc" : "desc"}`,
      start: (query.page - 1) * query.pageSize,
      pageLength: query.pageSize,
    });
    return {
      items: docs.map(toProduct),
      meta: { total, page: query.page, pageSize: query.pageSize },
    };
  }

  async detail(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<Product> {
    const { client } = await this.gateway.scopeFor(user.id, meta.requestId);
    const doc = await client
      .get<ErpItemRaw>(INVENTORY_DOCTYPE.item, code)
      .catch((err) => translateErpError(err, "Product"));
    return toProduct(doc);
  }

  async create(user: GatewayUser, meta: GatewayRequestMeta, input: CreateProductInput): Promise<Product> {
    const { client, companyId } = await this.gateway.scopeFor(user.id, meta.requestId);
    const created = await client.create<ErpItemDoc>(
      INVENTORY_DOCTYPE.item,
      buildItemDoc({
        sku: input.sku,
        name: input.name,
        category: input.category,
        unit: input.unit,
        price: input.price,
        cost: input.cost,
        description: input.description,
        status: input.status,
        isStockItem: input.isStockItem,
        isSalesItem: input.isSalesItem,
        isPurchaseItem: input.isPurchaseItem,
      }),
    );
    await this.gateway.audit({
      user,
      meta,
      companyId,
      action: "product.create",
      resourceType: INVENTORY_DOCTYPE.item,
      resourceId: created.name,
    });
    return toProduct(created);
  }

  async update(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    code: string,
    input: UpdateProductInput,
  ): Promise<Product> {
    const { client, companyId } = await this.gateway.scopeFor(user.id, meta.requestId);
    const patch: Record<string, unknown> = {};
    if (input.sku !== undefined) patch[ITEM_FIELDS.sku] = input.sku;
    if (input.name !== undefined) patch[ITEM_FIELDS.name] = input.name;
    if (input.category !== undefined) patch[ITEM_FIELDS.category] = input.category;
    if (input.unit !== undefined) patch[ITEM_FIELDS.unit] = input.unit;
    if (input.price !== undefined) patch[ITEM_FIELDS.price] = input.price;
    if (input.cost !== undefined) patch[ITEM_FIELDS.cost] = input.cost;
    if (input.description !== undefined) patch[ITEM_FIELDS.description] = input.description;
    if (input.status !== undefined) patch[ITEM_FIELDS.status] = input.status === "disabled" ? 1 : 0;
    if (input.isStockItem !== undefined) patch[ITEM_FIELDS.isStockItem] = input.isStockItem ? 1 : 0;
    if (input.isSalesItem !== undefined) patch[ITEM_FIELDS.isSalesItem] = input.isSalesItem ? 1 : 0;
    if (input.isPurchaseItem !== undefined) patch[ITEM_FIELDS.isPurchaseItem] = input.isPurchaseItem ? 1 : 0;
    if (input.reorderLevel !== undefined) patch["safety_stock"] = input.reorderLevel;

    const updated = await client
      .update<ErpItemDoc>(INVENTORY_DOCTYPE.item, code, patch)
      .catch((err) => translateErpError(err, "Product"));
    await this.gateway.audit({
      user,
      meta,
      companyId,
      action: "product.update",
      resourceType: INVENTORY_DOCTYPE.item,
      resourceId: code,
    });
    return toProduct(updated);
  }

  async remove(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<void> {
    const { client, companyId } = await this.gateway.scopeFor(user.id, meta.requestId);
    await client.delete(INVENTORY_DOCTYPE.item, code).catch((err) => translateErpError(err, "Product"));
    await this.gateway.audit({
      user,
      meta,
      companyId,
      action: "product.delete",
      resourceType: INVENTORY_DOCTYPE.item,
      resourceId: code,
    });
  }
}
