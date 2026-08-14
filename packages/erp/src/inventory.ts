import type { ErpClient } from "./client.js";
import type { DocStatus } from "./types.js";

/**
 * M5-001 (Track A): typed domain surface for the inventory side of ERPNext.
 *
 * Same conventions as `sales.ts`: `*_FIELDS` maps platform contract fields to
 * real Frappe fields, `build<Doc>()` helpers produce doc bodies, and the client
 * wrappers pin the doctype so M5-002 services never hardcode a doctype string.
 *
 * Stock movements are modeled with Stock Entry (the doctype ERPNext uses for
 * receipt / issue / transfer / repack). Stock levels are read from the Bin
 * doctype, which ERPNext keeps in sync with the Stock Ledger.
 */

export const INVENTORY_DOCTYPE = {
  item: "Item",
  warehouse: "Warehouse",
  stockEntry: "Stock Entry",
  bin: "Bin",
} as const;

/** Platform contract field -> Frappe field for the Item doctype. */
export const ITEM_FIELDS = {
  sku: "item_code",
  name: "item_name",
  category: "item_group",
  unit: "stock_uom",
  price: "standard_rate",
  cost: "valuation_rate",
  description: "description",
  status: "disabled",
  isStockItem: "is_stock_item",
  isSalesItem: "is_sales_item",
  isPurchaseItem: "is_purchase_item",
} as const;

/** Platform contract field -> Frappe field for the Warehouse doctype. */
export const WAREHOUSE_FIELDS = {
  name: "warehouse_name",
  status: "disabled",
} as const;

/** Platform contract field -> Frappe field for the Bin doctype (stock level). */
export const BIN_FIELDS = {
  productCode: "item_code",
  warehouseCode: "warehouse",
  onHand: "actual_qty",
  reserved: "reserved_qty",
  available: "projected_qty",
} as const;

export interface ErpItemDoc {
  name: string;
  item_code: string;
  item_name?: string;
  item_group?: string;
  stock_uom?: string;
  standard_rate?: number;
  valuation_rate?: number;
  description?: string;
  disabled?: number;
  is_stock_item?: number;
  is_sales_item?: number;
  is_purchase_item?: number;
  docstatus?: DocStatus;
}

export interface ErpWarehouseDoc {
  name: string;
  warehouse_name?: string;
  disabled?: number;
  docstatus?: DocStatus;
}

export interface ErpBinDoc {
  name: string;
  item_code: string;
  warehouse: string;
  actual_qty: number;
  reserved_qty?: number;
  projected_qty?: number;
}

export interface ErpStockEntryLine {
  item_code: string;
  item_name?: string;
  qty: number;
  s_warehouse?: string;
  t_warehouse?: string;
  basic_rate?: number;
}

export interface ErpStockEntryDoc {
  name: string;
  stock_entry_type?: string;
  posting_date?: string;
  purpose?: string;
  from_warehouse?: string;
  to_warehouse?: string;
  items: ErpStockEntryLine[];
  docstatus?: DocStatus;
}

export interface ItemInput {
  sku: string;
  name?: string;
  category?: string;
  unit?: string;
  price?: number;
  cost?: number;
  description?: string;
  status?: "active" | "draft" | "disabled";
  isStockItem?: boolean;
  isSalesItem?: boolean;
  isPurchaseItem?: boolean;
}

export interface WarehouseInput {
  name: string;
  status?: "active" | "inactive";
}

export type StockEntryType = "in" | "out" | "transfer" | "adjust";

export interface StockEntryInput {
  type: StockEntryType;
  productCode: string;
  productName?: string;
  quantity: number;
  fromWarehouse?: string | null;
  toWarehouse?: string | null;
  reason?: string;
  reference?: string;
  date?: string;
}

/** Platform movement type -> ERPNext Stock Entry type. */
export const STOCK_ENTRY_TYPE_BY_MOVEMENT = {
  in: "Material Receipt",
  out: "Material Issue",
  transfer: "Material Transfer",
  adjust: "Material Receipt",
} as const;

export function buildItemDoc(input: ItemInput): Record<string, unknown> {
  return {
    [ITEM_FIELDS.sku]: input.sku,
    [ITEM_FIELDS.name]: input.name ?? input.sku,
    [ITEM_FIELDS.category]: input.category ?? "Products",
    [ITEM_FIELDS.unit]: input.unit ?? "pcs",
    [ITEM_FIELDS.price]: input.price,
    [ITEM_FIELDS.cost]: input.cost,
    [ITEM_FIELDS.description]: input.description,
    [ITEM_FIELDS.status]: input.status === "disabled" ? 1 : 0,
    [ITEM_FIELDS.isStockItem]: input.isStockItem === false ? 0 : 1,
    [ITEM_FIELDS.isSalesItem]: input.isSalesItem === false ? 0 : 1,
    [ITEM_FIELDS.isPurchaseItem]: input.isPurchaseItem === true ? 1 : 0,
  };
}

export function buildWarehouseDoc(input: WarehouseInput): Record<string, unknown> {
  return {
    [WAREHOUSE_FIELDS.name]: input.name,
    [WAREHOUSE_FIELDS.status]: input.status === "inactive" ? 1 : 0,
  };
}

/**
 * Builds the Stock Entry doc body for a movement. The `s_warehouse` /
 * `t_warehouse` mapping follows ERPNext semantics: receipt (in) targets
 * `to_warehouse`, issue (out) sources `from_warehouse`, transfer sets both.
 */
export function buildStockEntryDoc(input: StockEntryInput): Record<string, unknown> {
  const type = STOCK_ENTRY_TYPE_BY_MOVEMENT[input.type];
  const doc: Record<string, unknown> = {
    stock_entry_type: type,
    posting_date: input.date,
    purpose: input.reason,
    items: [
      {
        item_code: input.productCode,
        item_name: input.productName,
        qty: input.quantity,
        ...(input.type === "in" || input.type === "adjust"
          ? { t_warehouse: input.toWarehouse ?? input.fromWarehouse }
          : {}),
        ...(input.type === "out" ? { s_warehouse: input.fromWarehouse } : {}),
        ...(input.type === "transfer"
          ? { s_warehouse: input.fromWarehouse, t_warehouse: input.toWarehouse }
          : {}),
      },
    ],
  };
  return doc;
}

export async function findItemBySku(client: ErpClient, sku: string): Promise<ErpItemDoc | undefined> {
  const { items } = await client.list<ErpItemDoc>(INVENTORY_DOCTYPE.item, {
    filters: { item_code: sku },
    fields: ["name", "item_code", "item_name", "item_group", "stock_uom", "standard_rate", "disabled"],
    limitPageLength: 1,
  });
  return items[0];
}

export async function createItem(client: ErpClient, input: ItemInput): Promise<ErpItemDoc> {
  return client.create<ErpItemDoc>(INVENTORY_DOCTYPE.item, buildItemDoc(input));
}

export async function createWarehouse(client: ErpClient, input: WarehouseInput): Promise<ErpWarehouseDoc> {
  return client.create<ErpWarehouseDoc>(INVENTORY_DOCTYPE.warehouse, buildWarehouseDoc(input));
}

export async function submitStockEntry(client: ErpClient, name: string): Promise<ErpStockEntryDoc> {
  return client.submit<ErpStockEntryDoc>(INVENTORY_DOCTYPE.stockEntry, name);
}

export async function cancelStockEntry(client: ErpClient, name: string): Promise<ErpStockEntryDoc> {
  return client.cancel<ErpStockEntryDoc>(INVENTORY_DOCTYPE.stockEntry, name);
}

export async function getStockLevel(
  client: ErpClient,
  productCode: string,
  warehouseCode?: string,
): Promise<ErpBinDoc[]> {
  const { items } = await client.list<ErpBinDoc>(INVENTORY_DOCTYPE.bin, {
    filters: {
      item_code: productCode,
      ...(warehouseCode ? { warehouse: warehouseCode } : {}),
    },
    fields: ["name", "item_code", "warehouse", "actual_qty", "reserved_qty", "projected_qty"],
    limitPageLength: 100,
  });
  return items;
}

/**
 * Executes a stock movement end-to-end: creates the Stock Entry draft and
 * immediately submits it so the ledger reflects the change. Keeps the
 * platform's movement contract (type/product/quantity/warehouses) intact.
 */
export async function executeStockMovement(client: ErpClient, input: StockEntryInput): Promise<ErpStockEntryDoc> {
  const created = await client.create<ErpStockEntryDoc>(
    INVENTORY_DOCTYPE.stockEntry,
    buildStockEntryDoc(input),
  );
  return client.submit<ErpStockEntryDoc>(INVENTORY_DOCTYPE.stockEntry, created.name);
}
