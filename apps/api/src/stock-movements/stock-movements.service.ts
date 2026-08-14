import { Injectable } from "@nestjs/common";
import {
  INVENTORY_DOCTYPE,
  executeStockMovement,
  type ErpStockEntryDoc,
  type ErpStockEntryLine,
} from "@amni/erp";
import {
  type CreateStockMovementInput,
  type MovementType,
  type StockMovement,
  type StockMovementListQuery,
  type StockMovementListResponse,
} from "@amni/shared";

import { toIso } from "../common/frappe";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ErpGatewayService } from "../erp-gateway/erp-gateway.service";
import { type GatewayRequestMeta, type GatewayUser } from "../erp-gateway/erp-gateway.service";

const SORT_WHITELIST = new Set(["code", "type", "productCode", "quantity", "date", "createdBy"]);

type ErpStockEntryRaw = ErpStockEntryDoc & {
  creation?: string;
  modified?: string;
  owner?: string;
  items: (ErpStockEntryLine & { uom?: string })[];
};

const MOVEMENT_TYPE_BY_STOCK_ENTRY_TYPE: Record<string, MovementType> = {
  "Material Issue": "out",
  "Material Transfer": "transfer",
  "Material Receipt": "in",
  "Material Transfer for Manufacture": "transfer",
};

function toMovement(doc: ErpStockEntryRaw): StockMovement {
  const line = doc.items?.[0];
  const type = MOVEMENT_TYPE_BY_STOCK_ENTRY_TYPE[doc.stock_entry_type ?? ""] ?? "adjust";
  return {
    code: doc.name,
    type,
    productCode: line?.item_code ?? "",
    productName: line?.item_name ?? line?.item_code ?? "",
    uom: line?.uom ?? "pcs",
    quantity: line?.qty ?? 0,
    fromWarehouse: line?.s_warehouse ?? null,
    toWarehouse: line?.t_warehouse ?? null,
    reason: doc.purpose,
    createdBy: doc.owner,
    date: toIso(doc.posting_date ?? doc.creation),
  };
}

/**
 * Stock movements backed by the tenant's real ERPNext Stock Entry doctype
 * (created + submitted via `executeStockMovement`). ERPNext has no native
 * "adjust" Stock Entry type, so adjustment movements read back as `in`
 * ("Material Receipt").
 */
@Injectable()
export class StockMovementsService {
  constructor(private readonly gateway: ErpGatewayService) {}

  async list(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    query: StockMovementListQuery,
  ): Promise<StockMovementListResponse> {
    const { client } = await this.gateway.scopeFor(user.id, meta.requestId);
    const { items: docs } = await client.list<ErpStockEntryRaw>(INVENTORY_DOCTYPE.stockEntry, {
      fields: [
        "name",
        "stock_entry_type",
        "posting_date",
        "purpose",
        "owner",
        "items.item_code",
        "items.item_name",
        "items.qty",
        "items.uom",
        "items.s_warehouse",
        "items.t_warehouse",
      ],
      limitPageLength: 0,
    });

    let records = docs.map(toMovement);
    if (query.type) {
      records = records.filter((movement) => movement.type === query.type);
    }
    if (query.productCode) {
      records = records.filter((movement) => movement.productCode === query.productCode);
    }

    const q = (query.q ?? "").toLowerCase().trim();
    if (q) {
      records = records.filter((movement) =>
        [
          movement.code,
          movement.productCode,
          movement.productName,
          movement.fromWarehouse ?? "",
          movement.toWarehouse ?? "",
          movement.reason ?? "",
          movement.createdBy ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }

    const sortBy = query.sortBy && SORT_WHITELIST.has(query.sortBy) ? query.sortBy : "date";
    const sortDir = query.sortDir === "asc" ? 1 : -1;
    const sorted = [...records].sort((a, b) => {
      const aValue = a[sortBy as keyof StockMovement];
      const bValue = b[sortBy as keyof StockMovement];
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

  async create(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    input: CreateStockMovementInput,
  ): Promise<StockMovement> {
    const { client, companyId } = await this.gateway.scopeFor(user.id, meta.requestId);
    const created = await executeStockMovement(client, {
      type: input.type,
      productCode: input.productCode,
      quantity: input.quantity,
      fromWarehouse: input.fromWarehouse ?? null,
      toWarehouse: input.toWarehouse ?? null,
      reason: input.reason,
    });
    await this.gateway.audit({
      user,
      meta,
      companyId,
      action: "movement.create",
      resourceType: INVENTORY_DOCTYPE.stockEntry,
      resourceId: created.name,
    });
    return toMovement(created as ErpStockEntryRaw);
  }
}
