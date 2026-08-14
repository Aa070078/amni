import { Injectable } from "@nestjs/common";
import {
  BIN_FIELDS,
  INVENTORY_DOCTYPE,
  WAREHOUSE_FIELDS,
  buildWarehouseDoc,
  type ErpBinDoc,
  type ErpWarehouseDoc,
} from "@amni/erp";
import {
  type CreateWarehouseInput,
  type StockLevel,
  type UpdateWarehouseInput,
  type Warehouse,
  type WarehouseDetail,
  type WarehouseListQuery,
  type WarehouseListResponse,
} from "@amni/shared";

import { toIso } from "../common/frappe";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ErpGatewayService } from "../erp-gateway/erp-gateway.service";
import { translateErpError, type GatewayRequestMeta, type GatewayUser } from "../erp-gateway/erp-gateway.service";

const SORT_WHITELIST = new Set([
  "name",
  "location",
  "manager",
  "status",
  "isDefault",
  "createdAt",
  "updatedAt",
]);

type ErpWarehouseRaw = ErpWarehouseDoc & { creation?: string; modified?: string };

function toWarehouse(doc: ErpWarehouseRaw): Warehouse {
  return {
    code: doc.name,
    name: doc.warehouse_name ?? doc.name,
    status: doc.disabled === 1 ? "inactive" : "active",
    isDefault: false,
    createdAt: toIso(doc.creation ?? doc.modified),
    updatedAt: toIso(doc.modified ?? doc.creation),
  };
}

function toStockLevel(bin: ErpBinDoc, reorderMap: Map<string, number>): StockLevel {
  const onHand = bin.actual_qty;
  const reserved = bin.reserved_qty ?? 0;
  return {
    productCode: bin.item_code,
    warehouseCode: bin.warehouse,
    onHand,
    reserved,
    available: bin.projected_qty ?? Math.max(0, onHand - reserved),
    reorderLevel: reorderMap.get(bin.item_code) ?? 0,
  };
}

/**
 * Warehouses backed by the tenant's real ERPNext Warehouse doctype. Stock on
 * the detail view is read from the Bin doctype. `location` / `manager` /
 * `isDefault` have no native ERPNext field, so they are not persisted
 * (reported as absent / false).
 */
@Injectable()
export class WarehousesService {
  constructor(private readonly gateway: ErpGatewayService) {}

  async list(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    query: WarehouseListQuery,
  ): Promise<WarehouseListResponse> {
    const { client } = await this.gateway.scopeFor(user.id, meta.requestId);
    const { items: docs } = await client.list<ErpWarehouseRaw>(INVENTORY_DOCTYPE.warehouse, {
      limitPageLength: 0,
    });

    let records = docs.map(toWarehouse);
    if (query.status) {
      records = records.filter((warehouse) => warehouse.status === query.status);
    }

    const q = (query.q ?? "").toLowerCase().trim();
    if (q) {
      records = records.filter((warehouse) =>
        [warehouse.code, warehouse.name, warehouse.location ?? "", warehouse.manager ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }

    const whitelisted = query.sortBy !== undefined && SORT_WHITELIST.has(query.sortBy);
    const sortBy = whitelisted ? query.sortBy : "createdAt";
    const sortDir = whitelisted && query.sortDir === "asc" ? 1 : -1;
    const sorted = [...records].sort((a, b) => {
      const aValue = a[sortBy as keyof Warehouse];
      const bValue = b[sortBy as keyof Warehouse];
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

  async detail(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<WarehouseDetail> {
    const { client } = await this.gateway.scopeFor(user.id, meta.requestId);
    const doc = await client
      .get<ErpWarehouseRaw>(INVENTORY_DOCTYPE.warehouse, code)
      .catch((err) => translateErpError(err, "Warehouse"));

    const { items: bins } = await client.list<ErpBinDoc>(INVENTORY_DOCTYPE.bin, {
      filters: { [BIN_FIELDS.warehouseCode]: code },
      fields: ["name", "item_code", "warehouse", "actual_qty", "reserved_qty", "projected_qty"],
      limitPageLength: 0,
    });
    const { items: items } = await client.list<{ name: string; reorder_level?: number }>(
      INVENTORY_DOCTYPE.item,
      { fields: ["name", "reorder_level"], limitPageLength: 0 },
    );
    const reorderMap = new Map(items.map((item) => [item.name, item.reorder_level ?? 0]));

    const stock = bins.map((bin) => toStockLevel(bin, reorderMap));
    const lowStock = stock.filter((row) => row.onHand < row.reorderLevel);
    return { ...toWarehouse(doc), stock, lowStock };
  }

  async create(user: GatewayUser, meta: GatewayRequestMeta, input: CreateWarehouseInput): Promise<Warehouse> {
    const { client, companyId } = await this.gateway.scopeFor(user.id, meta.requestId);
    const created = await client.create<ErpWarehouseRaw>(
      INVENTORY_DOCTYPE.warehouse,
      buildWarehouseDoc({ name: input.name, status: input.status }),
    );
    await this.gateway.audit({
      user,
      meta,
      companyId,
      action: "warehouse.create",
      resourceType: INVENTORY_DOCTYPE.warehouse,
      resourceId: created.name,
    });
    return toWarehouse(created);
  }

  async update(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    code: string,
    input: UpdateWarehouseInput,
  ): Promise<Warehouse> {
    const { client, companyId } = await this.gateway.scopeFor(user.id, meta.requestId);
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch[WAREHOUSE_FIELDS.name] = input.name;
    if (input.status !== undefined) patch[WAREHOUSE_FIELDS.status] = input.status === "inactive" ? 1 : 0;

    const updated = await client
      .update<ErpWarehouseRaw>(INVENTORY_DOCTYPE.warehouse, code, patch)
      .catch((err) => translateErpError(err, "Warehouse"));
    await this.gateway.audit({
      user,
      meta,
      companyId,
      action: "warehouse.update",
      resourceType: INVENTORY_DOCTYPE.warehouse,
      resourceId: code,
    });
    return toWarehouse(updated);
  }

  async remove(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<void> {
    const { client, companyId } = await this.gateway.scopeFor(user.id, meta.requestId);
    await client
      .delete(INVENTORY_DOCTYPE.warehouse, code)
      .catch((err) => translateErpError(err, "Warehouse"));
    await this.gateway.audit({
      user,
      meta,
      companyId,
      action: "warehouse.delete",
      resourceType: INVENTORY_DOCTYPE.warehouse,
      resourceId: code,
    });
  }
}
